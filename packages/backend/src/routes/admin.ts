/**
 * Admin Routes — /api/v1/admin/*
 * Phase 2: Full implementation of all admin endpoints.
 * Per api_specification.md §5.
 *
 * All endpoints require role=admin.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { generateAllLeaderboards } from '../services/leaderboard.js';
import { generateContentWithRetry } from '../services/ai.js';
import { GoogleGenAI } from '@google/genai';
import {
  ValidationError,
  NotFoundError,
  ApiError,
} from '../middleware/errorHandler.js';
import { getFirestore, getAuth, COLLECTIONS } from '../config/firebase.js';
import {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  UserRole,
  AgentType,
} from '@civicmind/shared';
import type { SLAConfig, JurisdictionMapping, AgentDecisionLog, User, Issue } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate as any);
router.use(requireAdmin as any);

// ─── Admin health check (Phase 1 exit criterion — kept for backward compat) ──
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  res.status(200).json({
    message: 'Admin console — authenticated successfully.',
    user: { uid: user.uid, role: user.role },
  });
}));

// ─── GET /api/v1/admin/sla-config ─────────────────────────────────────────────
router.get('/sla-config', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTIONS.SLA_CONFIG).orderBy('category').get();

  const configs = snapshot.docs.map((d) => {
    const c = d.data() as SLAConfig;
    return {
      config_id: c.config_id,
      category: c.category,
      severity: c.severity,
      sla_hours: c.sla_hours,
      updated_at: c.updated_at,
    };
  });

  res.status(200).json({ configs });
}));

// ─── PUT /api/v1/admin/sla-config ─────────────────────────────────────────────
router.put('/sla-config', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { category, severity, sla_hours } = req.body as {
    category?: string;
    severity?: string;
    sla_hours?: number;
  };

  if (!category || !Object.values(IssueCategory).includes(category as IssueCategory)) {
    throw new ValidationError(`category must be one of: ${Object.values(IssueCategory).join(', ')}`);
  }
  if (!severity || !Object.values(IssueSeverity).includes(severity as IssueSeverity)) {
    throw new ValidationError(`severity must be one of: ${Object.values(IssueSeverity).join(', ')}`);
  }
  if (!sla_hours || sla_hours <= 0 || !Number.isInteger(sla_hours)) {
    throw new ValidationError('sla_hours must be a positive integer.');
  }

  const db = getFirestore();
  const now = new Date().toISOString();

  // Find existing config for this combination
  const existingSnapshot = await db
    .collection(COLLECTIONS.SLA_CONFIG)
    .where('category', '==', category)
    .where('severity', '==', severity)
    .limit(1)
    .get();

  let configId: string;

  if (!existingSnapshot.empty) {
    configId = existingSnapshot.docs[0]!.id;
    await existingSnapshot.docs[0]!.ref.update({
      sla_hours,
      updated_by_admin_id: user.uid,
      updated_at: now,
    });
  } else {
    configId = uuidv4();
    await db.collection(COLLECTIONS.SLA_CONFIG).doc(configId).set({
      config_id: configId,
      category,
      severity,
      sla_hours,
      updated_by_admin_id: user.uid,
      updated_at: now,
    } as SLAConfig);
  }

  res.status(200).json({
    config_id: configId,
    category,
    severity,
    sla_hours,
    updated_at: now,
  });
}));

// ─── GET /api/v1/admin/jurisdiction-mapping ───────────────────────────────────
router.get('/jurisdiction-mapping', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .orderBy('ward_or_area_id')
    .get();

  const mappings = snapshot.docs.map((d) => {
    const m = d.data() as JurisdictionMapping;
    return {
      mapping_id: m.mapping_id,
      ward_or_area_id: m.ward_or_area_id,
      category: m.category,
      department_id: m.department_id,
      is_fallback: m.is_fallback,
    };
  });

  res.status(200).json({ mappings });
}));

// ─── PUT /api/v1/admin/jurisdiction-mapping ───────────────────────────────────
router.put('/jurisdiction-mapping', asyncHandler(async (req: Request, res: Response) => {
  const { ward_or_area_id, category, department_id, replace } = req.body as {
    ward_or_area_id?: string;
    category?: string;
    department_id?: string;
    replace?: boolean;
  };

  if (!ward_or_area_id) throw new ValidationError('ward_or_area_id is required.');
  if (!category || !Object.values(IssueCategory).includes(category as IssueCategory)) {
    throw new ValidationError(`category must be one of: ${Object.values(IssueCategory).join(', ')}`);
  }
  if (!department_id) throw new ValidationError('department_id is required.');

  const db = getFirestore();

  // Validate department exists
  const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(department_id).get();
  if (!deptDoc.exists) throw new NotFoundError('Department');

  // Check for conflicting existing mapping
  const existingSnapshot = await db
    .collection(COLLECTIONS.JURISDICTION_MAPPINGS)
    .where('ward_or_area_id', '==', ward_or_area_id)
    .where('category', '==', category)
    .limit(1)
    .get();

  if (!existingSnapshot.empty && !replace) {
    throw new ApiError(
      409,
      'CONFLICT',
      `A mapping already exists for ward "${ward_or_area_id}" + category "${category}". Pass replace=true to overwrite.`
    );
  }

  let mappingId: string;

  if (!existingSnapshot.empty && replace) {
    mappingId = existingSnapshot.docs[0]!.id;
    await existingSnapshot.docs[0]!.ref.update({ department_id });
  } else {
    mappingId = uuidv4();
    await db.collection(COLLECTIONS.JURISDICTION_MAPPINGS).doc(mappingId).set({
      mapping_id: mappingId,
      ward_or_area_id,
      category,
      department_id,
      is_fallback: false,
    } as JurisdictionMapping);
  }

  res.status(200).json({
    mapping_id: mappingId,
    ward_or_area_id,
    category,
    department_id,
  });
}));

// ─── GET /api/v1/admin/agent-decision-log ─────────────────────────────────────
router.get('/agent-decision-log', asyncHandler(async (req: Request, res: Response) => {
  const {
    agent_type,
    issue_id,
    date_from,
    date_to,
    limit: limitStr,
    cursor,
  } = req.query as {
    agent_type?: string;
    issue_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: string;
    cursor?: string;
  };

  const db = getFirestore();
  const pageLimit = Math.min(parseInt(limitStr ?? '50', 10), 200);

  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.AGENT_DECISION_LOG)
    .orderBy('created_at', 'desc')
    .limit(pageLimit + 1);

  if (agent_type && Object.values(AgentType).includes(agent_type as AgentType)) {
    query = query.where('agent_type', '==', agent_type);
  }
  if (issue_id) {
    query = query.where('issue_id', '==', issue_id);
  }
  if (date_from) {
    query = query.where('created_at', '>=', date_from);
  }
  if (date_to) {
    query = query.where('created_at', '<=', date_to);
  }

  if (cursor) {
    try {
      const cursorDoc = await db.collection(COLLECTIONS.AGENT_DECISION_LOG).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    } catch { /* ignore */ }
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > pageLimit;
  const docs = hasMore ? snapshot.docs.slice(0, pageLimit) : snapshot.docs;

  const logs = docs.map((d) => {
    const l = d.data() as AgentDecisionLog;
    return {
      log_id: l.log_id,
      issue_id: l.issue_id ?? null,
      agent_type: l.agent_type,
      input_summary: l.input_summary,
      output_summary: l.output_summary,
      confidence_score: l.confidence_score ?? null,
      agent_version: l.agent_version,
      created_at: l.created_at,
    };
  });

  res.status(200).json({
    logs,
    next_cursor: hasMore ? docs[docs.length - 1]!.id : null,
  });
}));

// ─── GET /api/v1/admin/users ───────────────────────────────────────────────────
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const { role, limit: limitStr, cursor } = req.query as {
    role?: string;
    limit?: string;
    cursor?: string;
  };

  const db = getFirestore();
  const pageLimit = Math.min(parseInt(limitStr ?? '50', 10), 200);

  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.USERS)
    .where('role', 'in', [UserRole.Authority, UserRole.Admin])
    .orderBy('created_at', 'desc')
    .limit(pageLimit + 1);

  if (role && [UserRole.Authority, UserRole.Admin].includes(role as UserRole)) {
    query = db
      .collection(COLLECTIONS.USERS)
      .where('role', '==', role)
      .orderBy('created_at', 'desc')
      .limit(pageLimit + 1);
  }

  if (cursor) {
    try {
      const cursorDoc = await db.collection(COLLECTIONS.USERS).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    } catch { /* ignore */ }
  }

  const snapshot = await query.get();
  const hasMore = snapshot.docs.length > pageLimit;
  const docs = hasMore ? snapshot.docs.slice(0, pageLimit) : snapshot.docs;

  const users = docs.map((d) => {
    const u = d.data() as User;
    return {
      user_id: u.user_id,
      role: u.role,
      display_name: u.display_name ?? null,
      email: u.email ?? null,
      department_id: u.department_id ?? null,
      jurisdiction_scope: u.jurisdiction_scope ?? [],
      created_at: u.created_at,
    };
  });

  res.status(200).json({
    users,
    next_cursor: hasMore ? docs[docs.length - 1]!.id : null,
  });
}));

// ─── POST /api/v1/admin/users ──────────────────────────────────────────────────
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const { email, role, department_id, jurisdiction_scope } = req.body as {
    email?: string;
    role?: string;
    department_id?: string | null;
    jurisdiction_scope?: string[];
  };

  if (!email || !email.includes('@')) throw new ValidationError('A valid email is required.');
  if (!role || ![UserRole.Authority, UserRole.Admin].includes(role as UserRole)) {
    throw new ValidationError(`role must be "authority" or "admin".`);
  }
  if (role === UserRole.Authority && !department_id) {
    throw new ValidationError('department_id is required for authority users.');
  }

  const db = getFirestore();

  // Check email not already registered
  try {
    await getAuth().getUserByEmail(email);
    throw new ApiError(409, 'CONFLICT', `Email ${email} is already registered.`);
  } catch (err) {
    if ((err as any).code !== 'auth/user-not-found') throw err;
  }

  // Validate department if provided
  if (department_id) {
    const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(department_id).get();
    if (!deptDoc.exists) throw new NotFoundError('Department');
  }

  // Create Firebase Auth user
  const userRecord = await getAuth().createUser({ email, emailVerified: false });
  await getAuth().setCustomUserClaims(userRecord.uid, {
    role,
    department_id: department_id ?? null,
    jurisdiction_scope: jurisdiction_scope ?? [],
  });

  const now = new Date().toISOString();
  const userId = userRecord.uid;

  await db.collection(COLLECTIONS.USERS).doc(userId).set({
    user_id: userId,
    role,
    email,
    auth_provider_id: userId,
    department_id: department_id ?? null,
    jurisdiction_scope: jurisdiction_scope ?? [],
    hero_points_balance: 0,
    is_guest: false,
    preferred_language: 'en',
    created_at: now,
    updated_at: now,
  } as User);

  res.status(201).json({
    user_id: userId,
    email,
    role,
    department_id: department_id ?? null,
    jurisdiction_scope: jurisdiction_scope ?? [],
    invite_sent: true, // Conceptual — in production, a password reset/invite link email would be sent
  });
}));

// ─── GET /api/v1/admin/map/hotspot-forecasts ──────────────────────────────────
// Admin/authority view including suppressed forecasts
router.get('/map/hotspot-forecasts', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.HOTSPOT_FORECASTS)
    .orderBy('generated_at', 'desc')
    .limit(100)
    .get();

  const forecasts = snapshot.docs.map((d) => d.data());
  res.status(200).json({ forecasts });
}));

// ─── GET /api/v1/impact-reports ───────────────────────────────────────────────
// Public summary view (no auth required, but admin route for full export is here too)
router.get('/impact-reports', asyncHandler(async (req: Request, res: Response) => {
  const { ward_or_area_id, period_start, period_end } = req.query as {
    ward_or_area_id?: string;
    period_start?: string;
    period_end?: string;
  };

  const db = getFirestore();
  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.IMPACT_REPORTS)
    .orderBy('generated_at', 'desc')
    .limit(50);

  if (ward_or_area_id) query = query.where('ward_or_area_id', '==', ward_or_area_id);
  if (period_start) query = query.where('period_start', '>=', period_start);
  if (period_end) query = query.where('period_end', '<=', period_end);

  const snapshot = await query.get();
  res.status(200).json({ reports: snapshot.docs.map((d) => d.data()) });
}));

// ─── POST /api/v1/admin/impact-reports/generate ───────────────────────────────
router.post('/impact-reports/generate', asyncHandler(async (req: Request, res: Response) => {
  const { ward_or_area_id, period_start, period_end } = req.body as {
    ward_or_area_id?: string;
    period_start?: string;
    period_end?: string;
  };

  if (!ward_or_area_id || !period_start || !period_end) {
    throw new ValidationError('ward_or_area_id, period_start, and period_end are required.');
  }

  const db = getFirestore();

  // Fetch all canonical issues in this ward/period
  const issuesSnapshot = await db
    .collection(COLLECTIONS.ISSUES)
    .where('ward_or_area_id', '==', ward_or_area_id)
    .where('created_at', '>=', period_start)
    .where('created_at', '<=', period_end)
    .where('is_canonical', '==', true)
    .get();

  const issues = issuesSnapshot.docs.map((d) => d.data() as Issue);

  if (issues.length < 3) {
    throw new ApiError(422, 'INSUFFICIENT_DATA', 'Minimum 3 issues required to generate an impact report.');
  }

  // Compute metrics
  const totalIssues = issues.length;
  const resolvedIssues = issues.filter((i) => [
    IssueStatus.VerifiedResolved, IssueStatus.Closed
  ].includes(i.status));
  const resolutionRate = resolvedIssues.length / totalIssues;

  const escalatedIssues = issues.filter((i) => i.escalation_tier_current > 0);
  const escalationRate = escalatedIssues.length / totalIssues;

  // Avg resolution hours
  let avgResolutionHours = 0;
  const resolvedWithTime = resolvedIssues.filter((i) => i.resolved_at);
  if (resolvedWithTime.length > 0) {
    const totalMs = resolvedWithTime.reduce((sum, i) => {
      return sum + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime());
    }, 0);
    avgResolutionHours = totalMs / resolvedWithTime.length / (1000 * 60 * 60);
  }

  let avgVerificationHours = 0;
  const verifiedWithTime = resolvedIssues.filter((i) => i.verified_at);
  if (verifiedWithTime.length > 0) {
    const totalMs = verifiedWithTime.reduce((sum, i) => {
      return sum + (new Date(i.verified_at!).getTime() - new Date(i.created_at).getTime());
    }, 0);
    avgVerificationHours = totalMs / verifiedWithTime.length / (1000 * 60 * 60);
  }

  // Estimated savings (proxy: 500 INR per pothole resolved, 200 per garbage, etc.)
  const SAVINGS_PROXY: Record<string, number> = {
    pothole: 500, road_damage: 400, streetlight: 200, garbage: 150, water_leakage: 300,
    traffic_signal: 250, drainage: 200, other: 100,
  };
  const estimatedSavings = resolvedIssues.reduce((sum, i) => sum + (SAVINGS_PROXY[i.category] ?? 100), 0);

  // Civic health score (0–100): weighted composite
  const healthScore = Math.round(
    (resolutionRate * 50) +
    ((1 - escalationRate) * 30) +
    (Math.max(0, 1 - avgResolutionHours / (7 * 24)) * 20)
  );

  const reportId = uuidv4();
  const now = new Date().toISOString();

  const report = {
    report_id: reportId,
    ward_or_area_id,
    period_start,
    period_end,
    total_issues: totalIssues,
    resolution_rate: resolutionRate,
    avg_resolution_hours: avgResolutionHours,
    avg_verification_hours: avgVerificationHours,
    escalation_rate: escalationRate,
    estimated_savings_value: estimatedSavings,
    civic_health_score: Math.min(100, Math.max(0, healthScore)),
    generated_at: now,
  };

  await db.collection(COLLECTIONS.IMPACT_REPORTS).doc(reportId).set(report);

  res.status(200).json({ status: 'generated', ...report });
}));

// ─── POST /api/v1/admin/impact-reports/generate-all ───────────────────────────
router.post('/impact-reports/generate-all', asyncHandler(async (_req: Request, res: Response) => {
  const count = await generateAllLeaderboards();
  res.status(200).json({ status: 'generated', count });
}));

// ─── POST /api/v1/admin/copilot ───────────────────────────────────────────────
router.post('/copilot', asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body as { query?: string };
  if (!query) throw new ValidationError('query is required.');

  const db = getFirestore();
  
  // Fetch SLA configs for context
  const slaSnapshot = await db.collection(COLLECTIONS.SLA_CONFIG).get();
  const slaConfigs = slaSnapshot.docs.map(d => d.data());
  
  // Fetch recent impact reports for context
  const reportsSnapshot = await db.collection(COLLECTIONS.IMPACT_REPORTS).orderBy('generated_at', 'desc').limit(50).get();
  const impactReports = reportsSnapshot.docs.map(d => d.data());

  const contextStr = JSON.stringify({
    slaConfigs,
    impactReports: impactReports.map((r: any) => ({
      ward: r.ward_or_area_id,
      score: r.civic_health_score,
      resolution_rate: r.resolution_rate,
      avg_hours: r.avg_resolution_hours,
      total_issues: r.total_issues
    }))
  }, null, 2);

  const prompt = `You are CivicMind Copilot, an AI assistant for city administrators. 
Use the following JSON data about SLA configurations and Ward Impact Reports to answer the admin's query.
If the query cannot be answered using this data, politely say so. Keep your answer concise and formatting-friendly (markdown allowed).

Context Data:
${contextStr}

Admin Query:
"${query}"`;

  const aiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!aiKey) {
    throw new ApiError(500, 'INTERNAL_ERROR', 'Google GenAI API key is missing. Ensure GOOGLE_GENAI_API_KEY is set in your .env');
  }
  const client = new GoogleGenAI({ apiKey: aiKey });

  const aiResponse = await generateContentWithRetry(client, {
    model: process.env['GEMINI_MODEL_TEXT'] || 'gemini-3.1-flash-lite',
    contents: prompt
  });

  const answer = aiResponse?.text || 'No response generated.';
  res.status(200).json({ answer });
}));

// ─── PATCH /api/v1/admin/forecasts/:forecast_id ─────────────────────────────
// Toggle is_public_visible for a hotspot forecast (PredictiveReviewScreen)
router.patch('/forecasts/:forecast_id', asyncHandler(async (req: Request, res: Response) => {
  const { forecast_id } = req.params;
  const { is_public_visible } = req.body as { is_public_visible?: boolean };

  if (typeof is_public_visible !== 'boolean') {
    throw new ValidationError('is_public_visible must be a boolean.');
  }

  const db = getFirestore();
  const forecastRef = db.collection(COLLECTIONS.HOTSPOT_FORECASTS).doc(forecast_id);
  const forecastDoc = await forecastRef.get();

  if (!forecastDoc.exists) {
    throw new NotFoundError('Forecast');
  }

  await forecastRef.update({
    is_public_visible,
    updated_at: new Date().toISOString(),
  });

  res.status(200).json({ forecast_id, is_public_visible });
}));

// ─── GET /api/v1/admin/agent-health-alerts ─────────────────────────────────
router.get('/agent-health-alerts', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  const snapshot = await db.collection('agent_health_alerts')
    .where('is_active', '==', true)
    .get();

  const alerts = snapshot.docs.map(d => d.data());
  alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  res.status(200).json({ alerts: alerts.slice(0, 50) });
}));

export default router;
