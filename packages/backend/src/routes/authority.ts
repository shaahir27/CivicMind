/**
 * Authority Routes — /api/v1/authority/*
 * Phase 2: Full implementation of authority-facing issue endpoints.
 * Per api_specification.md §4.
 *
 * All endpoints require role=authority and are scoped to the authenticated
 * user's department_id / jurisdiction_scope (BR-8.2).
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireAuthority, assertWithinJurisdiction } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  MissingRequiredEvidenceError,
  InvalidStateTransitionError,
} from '../middleware/errorHandler.js';
import { validate, authorityStatusUpdateSchema, authorityReassignSchema } from '../middleware/validate.js';
import { standardRateLimit } from '../middleware/rateLimiter.js';

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import {
  IssueStatus,
  SLARisk,
  computeSLARiskFull,
} from '@civicmind/shared';
import type { Issue, IssueStatusHistory, Department } from '@civicmind/shared';
import type { AuthRequest } from '../middleware/authenticate.js';
import {
  orchestrateAuthorityStatusUpdate,
} from '../services/orchestrator.js';
import { notifyIssueStateChange } from '../services/notificationService.js';
import { ActorType, UserRole } from '@civicmind/shared';
import type { Request, Response } from 'express';

const router = Router();

router.use(authenticate as any);
router.use(requireAuthority as any);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validates that the authenticated authority user owns the issue
 * (i.e., it belongs to their department). Per BR-8.2.
 */
async function assertAuthorityOwnsIssue(
  issue: Issue,
  departmentId: string | undefined
): Promise<void> {
  if (!departmentId) throw new ForbiddenError('Authority user has no department_id assigned.');
  if (issue.department_id !== departmentId) {
    throw new ForbiddenError(
      `Issue ${issue.issue_id} belongs to department ${issue.department_id ?? 'unassigned'}, not your department (${departmentId}).`
    );
  }
}

function computeTimeRemaining(slaDeadline: string | null | undefined): number | null {
  if (!slaDeadline) return null;
  return Math.max(0, new Date(slaDeadline).getTime() - Date.now()) / 1000;
}

// ─── GET /api/v1/authority/issues ────────────────────────────────────────────
router.get('/issues', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { status, sla_risk, limit: limitStr, cursor } = req.query as {
    status?: string;
    sla_risk?: 'at_risk' | 'breached' | 'normal';
    limit?: string;
    cursor?: string;
  };

  const db = getFirestore();
  const pageLimit = Math.min(parseInt(limitStr ?? '50', 10), 200);

  // All issues must be scoped to the authority's department (server-side, never trust client)
  if (!user.departmentId) {
    throw new ForbiddenError('Authority user has no department_id — cannot access issue queue.');
  }

  // To avoid requiring complex Firestore composite indexes (which cause FAILED_PRECONDITION crashes),
  // we query ONLY on department_id (a single-field index created automatically by Firestore)
  // and perform the rest of the filtering and sorting in-memory.
  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.ISSUES)
    .where('department_id', '==', user.departmentId);

  let snapshot: FirebaseFirestore.QuerySnapshot;
  try {
    snapshot = await query.get();
  } catch (err: any) {
    if (err?.code === 9 || String(err?.message ?? '').includes('FAILED_PRECONDITION')) {
      res.status(200).json({ issues: [], has_more: false, next_cursor: null, _index_building: true });
      return;
    }
    throw err;
  }
  
  // In-memory filter for is_canonical, status, and sort by created_at asc
  let allDocs = snapshot.docs.map(d => d.data() as Issue);
  allDocs = allDocs.filter(issue => issue.is_canonical === true);
  
  const scope = user.jurisdictionScope ?? [];
  const isDemoAccount = user.email === 'officer.bescom@civicmind.gov';
  // Demo hack: Bypass jurisdiction filter for the main demo account so it can see 
  // live geocoded tickets from anywhere in the world.
  if (user.role === UserRole.Authority && scope.length > 0 && !isDemoAccount) {
    allDocs = allDocs.filter(issue => scope.includes(issue.ward_or_area_id));
  }
  
  if (status && Object.values(IssueStatus).includes(status as IssueStatus)) {
    allDocs = allDocs.filter(issue => issue.status === status);
  }
  
  allDocs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Simple pagination slice
  const startIndex = cursor ? allDocs.findIndex(i => i.issue_id === cursor) + 1 : 0;
  const slicedDocs = allDocs.slice(startIndex, startIndex + pageLimit);
  const hasMore = startIndex + pageLimit < allDocs.length;
  
  const issues = await Promise.all(
    slicedDocs.map(async (issue) => {

      // Compute SLA risk
      let slaRiskLevel: SLARisk | null = null;
      let timeRemaining: number | null = null;

      if (issue.sla_deadline) {
        timeRemaining = computeTimeRemaining(issue.sla_deadline);

        const routedHistorySnapshot = await db
          .collection(COLLECTIONS.ISSUE_STATUS_HISTORY)
          .where('issue_id', '==', issue.issue_id)
          .where('to_status', '==', IssueStatus.Routed)
          .limit(1)
          .get();

        if (!routedHistorySnapshot.empty) {
          const routedAt = new Date(routedHistorySnapshot.docs[0]!.data()['created_at'] as string);
          slaRiskLevel = computeSLARiskFull(routedAt, new Date(issue.sla_deadline));
        }
      }

      return {
        issue_id: issue.issue_id,
        category: issue.category,
        severity: issue.severity,
        status: issue.status,
        location: {
          lat: issue.location_lat,
          lng: issue.location_lng,
          address_text: issue.location_address_text ?? '',
        },
        corroboration_count: issue.corroboration_count,
        sla_deadline: issue.sla_deadline ?? null,
        time_remaining_seconds: timeRemaining,
        sla_risk: slaRiskLevel,
        escalation_tier_current: issue.escalation_tier_current,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    })
  );

  // Post-filter by sla_risk if requested
  const filteredIssues = sla_risk
    ? issues.filter((i) => i.sla_risk === sla_risk)
    : issues;

  res.status(200).json({
    issues: filteredIssues,
    next_cursor: hasMore ? slicedDocs[slicedDocs.length - 1]!.issue_id : null,
  });
}));

// ─── POST /api/v1/authority/issues/:issue_id/status ────────────────────────────
router.post('/issues/:issue_id/status', standardRateLimit, validate(authorityStatusUpdateSchema), asyncHandler(async (req: Request, res: Response) => {

  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };
  const { new_status, after_photo_ref } = req.body as {
    new_status?: string;
    after_photo_ref?: string | null;
  };

  if (!new_status || !['in_progress', 'resolved'].includes(new_status)) {
    throw new ValidationError('new_status must be "in_progress" or "resolved".');
  }

  if (new_status === 'resolved' && !after_photo_ref) {
    throw new MissingRequiredEvidenceError('An after_photo_ref is required when marking an issue resolved (BR-5.1).');
  }

  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;
  await assertAuthorityOwnsIssue(issue, user.departmentId);
  assertWithinJurisdiction(user, issue.ward_or_area_id);

  const result = await orchestrateAuthorityStatusUpdate({
    issueId: issue_id,
    newStatus: new_status as 'in_progress' | 'resolved',
    afterPhotoStoragePath: after_photo_ref,
    authorityUserId: user.uid,
  });

  res.status(200).json({
    issue_id: result.issueId,
    status: result.status,
  });
}));

// ─── POST /api/v1/authority/issues/:issue_id/reassign ────────────────────────
router.post('/issues/:issue_id/reassign', standardRateLimit, validate(authorityReassignSchema), asyncHandler(async (req: Request, res: Response) => {

  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };
  const { new_department_id, reason } = req.body as {
    new_department_id?: string;
    reason?: string;
  };

  if (!new_department_id) throw new ValidationError('new_department_id is required.');
  if (!reason) throw new ValidationError('reason is required (BR-3.3).');

  const db = getFirestore();

  // Validate new department exists
  const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(new_department_id).get();
  if (!deptDoc.exists) throw new NotFoundError('Department');

  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;
  await assertAuthorityOwnsIssue(issue, user.departmentId);
  assertWithinJurisdiction(user, issue.ward_or_area_id);

  const now = new Date().toISOString();
  const deptName = (deptDoc.data() as Department).name;

  await db.collection(COLLECTIONS.ISSUES).doc(issue_id).update({
    department_id: new_department_id,
    updated_at: now,
  });

  // Write a status history entry noting the reassignment (issue stays in routed)
  const { v4: uuidv4 } = await import('uuid');
  const historyId = uuidv4();
  await db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc(historyId).set({
    history_id: historyId,
    issue_id,
    from_status: issue.status,
    to_status: issue.status, // status doesn't change, just department
    actor_type: ActorType.Authority,
    actor_id: user.uid,
    reason: `Reassigned to ${deptName}: ${reason}`,
    created_at: now,
  } as IssueStatusHistory);

  await notifyIssueStateChange({
    issueId: issue_id,
    reporterUserId: issue.reporter_user_id,
    newStatus: issue.status,
    departmentName: deptName,
  });

  res.status(200).json({
    issue_id,
    department_id: new_department_id,
    status: issue.status,
  });
}));

// ─── POST /api/v1/authority/issues/:issue_id/assign-work-order ─────────────
router.post('/issues/:issue_id/assign-work-order', standardRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { issue_id } = req.params;
  const { contractor_name } = req.body as { contractor_name?: string };

  if (!contractor_name) throw new ValidationError('contractor_name is required.');

  const db = getFirestore();
  const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issue_id);
  const issueDoc = await issueRef.get();
  
  if (!issueDoc.exists) throw new NotFoundError('Issue');
  const issue = issueDoc.data() as Issue;
  
  await assertAuthorityOwnsIssue(issue, user.departmentId);
  assertWithinJurisdiction(user, issue.ward_or_area_id);

  // State machine guard: can only assign a work order from 'routed' state
  if (issue.status !== IssueStatus.Routed) {
    throw new InvalidStateTransitionError(issue.status, IssueStatus.InProgress);
  }

  const now = new Date().toISOString();
  await issueRef.update({
    status: IssueStatus.InProgress,
    assigned_worker_id: contractor_name, // Reusing assigned_worker_id for contractor
    updated_at: now
  });

  const { v4: uuidv4 } = await import('uuid');
  const historyId = uuidv4();
  await db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc(historyId).set({
    history_id: historyId,
    issue_id,
    from_status: issue.status,
    to_status: IssueStatus.InProgress,
    actor_type: ActorType.Authority,
    actor_id: user.uid,
    reason: `Work order assigned to: ${contractor_name}`,
    created_at: now,
  } as IssueStatusHistory);

  res.status(200).json({ issue_id, status: IssueStatus.InProgress, contractor_name });
}));

// ─── POST /api/v1/authority/issues/:issue_id/assign (Field Workers) ────────
router.post('/issues/:issue_id/assign', standardRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { issue_id } = req.params;
  const { worker_id } = req.body as { worker_id?: string };

  if (!worker_id) throw new ValidationError('worker_id is required.');

  const db = getFirestore();
  const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issue_id);
  const issueDoc = await issueRef.get();
  
  if (!issueDoc.exists) throw new NotFoundError('Issue');
  const issue = issueDoc.data() as Issue;
  
  await assertAuthorityOwnsIssue(issue, user.departmentId);
  assertWithinJurisdiction(user, issue.ward_or_area_id);

  const workerRef = db.collection('field_workers').doc(worker_id);
  const workerDoc = await workerRef.get();
  if (!workerDoc.exists) throw new NotFoundError('FieldWorker');
  
  const worker = workerDoc.data() as any;
  if (worker.department_id !== user.departmentId) throw new ForbiddenError('Worker does not belong to your department');

  const now = new Date().toISOString();
  await issueRef.update({
    assigned_worker_id: worker_id,
    updated_at: now
  });

  const { v4: uuidv4 } = await import('uuid');
  const historyId = uuidv4();
  await db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc(historyId).set({
    history_id: historyId,
    issue_id,
    from_status: issue.status,
    to_status: issue.status,
    actor_type: ActorType.Authority,
    actor_id: user.uid,
    reason: `Assigned to field worker: ${worker.display_name}`,
    created_at: now,
  } as IssueStatusHistory);

  res.status(200).json({ issue_id, status: issue.status, worker_id });
}));

// ─── GET /api/v1/authority/workers ─────────────────────────────────────────
router.get('/workers', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const db = getFirestore();

  if (!user.departmentId) {
    throw new ForbiddenError('Authority user has no department_id');
  }

  let snapshot: FirebaseFirestore.QuerySnapshot;
  try {
    snapshot = await db.collection('field_workers')
      .where('department_id', '==', user.departmentId)
      .get();
  } catch (err: any) {
    if (err?.code === 9 || String(err?.message ?? '').includes('FAILED_PRECONDITION')) {
      res.status(200).json({ workers: [], _index_building: true });
      return;
    }
    throw err;
  }

  const workers = snapshot.docs.map(d => d.data());
  
  // Create mock workers if none exist (for hackathon demo)
  if (workers.length === 0) {
    const mockWorkers = [
      { worker_id: 'w1', department_id: user.departmentId, display_name: 'Alice Singh', skills: ['Electrical', 'Pothole'], is_active: true, current_workload_count: 2 },
      { worker_id: 'w2', department_id: user.departmentId, display_name: 'Bob Sharma', skills: ['Plumbing', 'Garbage'], is_active: true, current_workload_count: 0 },
      { worker_id: 'w3', department_id: user.departmentId, display_name: 'Charlie Raj', skills: ['General'], is_active: true, current_workload_count: 1 },
    ];
    
    for (const w of mockWorkers) {
      await db.collection('field_workers').doc(w.worker_id).set(w);
      workers.push(w);
    }
  }

  res.status(200).json({ workers });
}));

// ─── GET /api/v1/authority/performance-summary ─────────────────────────────
router.get('/performance-summary', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const db = getFirestore();

  if (!user.departmentId) {
    throw new ForbiddenError('Authority user has no department_id');
  }

  let snapshot: FirebaseFirestore.QuerySnapshot;
  try {
    snapshot = await db.collection(COLLECTIONS.ISSUES)
      .where('department_id', '==', user.departmentId)
      .get();
  } catch (err: any) {
    if (err?.code === 9 || String(err?.message ?? '').includes('FAILED_PRECONDITION')) {
      res.status(200).json({ department_id: user.departmentId, total_resolved: 0, avg_resolution_hours: 0, verification_success_rate: 0, peer_rank: 0, _index_building: true });
      return;
    }
    throw err;
  }

  let totalMs = 0;
  let resolvedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() as Issue;
    if (data.status === IssueStatus.VerifiedResolved || data.status === IssueStatus.Closed) {
      resolvedCount++;
      if (data.resolved_at && data.created_at) {
        totalMs += (new Date(data.resolved_at).getTime() - new Date(data.created_at).getTime());
      }
    }
  }

  const avgResolutionHours = resolvedCount > 0 ? (totalMs / resolvedCount) / (1000 * 60 * 60) : 0;

  // Compute real verification_success_rate from verifier agent decisions for this department
  let verificationSuccessRate = 0;
  try {
    const verifierSnap = await db.collection(COLLECTIONS.AGENT_DECISION_LOG)
      .where('agent_type', '==', 'verifier')
      .limit(200)
      .get();
    
    // Filter in-memory to this department's issues (using known issue IDs)
    const deptIssueIds = new Set(snapshot.docs.map(d => d.id));
    const verifierDocs = verifierSnap.docs.map(d => d.data());
    const deptVerifications = verifierDocs.filter(d => deptIssueIds.has(d.issue_id));
    const successCount = deptVerifications.filter(d => {
      try { return JSON.parse(d.output_summary)?.result === 'verified_resolved'; } catch { return false; }
    }).length;
    verificationSuccessRate = deptVerifications.length > 0 ? successCount / deptVerifications.length : 0;
  } catch {
    verificationSuccessRate = 0;
  }

  // Compute peer_rank vs other departments by avg resolution hours (lower = better rank)
  let peerRank = 1;
  try {
    const allIssuesSnap = await db.collection(COLLECTIONS.ISSUES)
      .where('status', 'in', [IssueStatus.VerifiedResolved, IssueStatus.Closed])
      .limit(500)
      .get();
    
    const deptHours: Map<string, number[]> = new Map();
    for (const doc of allIssuesSnap.docs) {
      const d = doc.data() as Issue;
      if (!d.department_id || !d.resolved_at || !d.created_at) continue;
      const hrs = (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
      if (!deptHours.has(d.department_id)) deptHours.set(d.department_id, []);
      deptHours.get(d.department_id)!.push(hrs);
    }
    
    const deptAvgs: Array<{id: string, avg: number}> = [];
    for (const [id, hours] of deptHours.entries()) {
      deptAvgs.push({ id, avg: hours.reduce((a, b) => a + b, 0) / hours.length });
    }
    deptAvgs.sort((a, b) => a.avg - b.avg); // lowest hours = best rank
    
    const myRank = deptAvgs.findIndex(d => d.id === user.departmentId);
    peerRank = myRank >= 0 ? myRank + 1 : deptAvgs.length + 1;
  } catch {
    peerRank = 1;
  }

  res.status(200).json({
    department_id: user.departmentId,
    total_resolved: resolvedCount,
    avg_resolution_hours: avgResolutionHours,
    verification_success_rate: verificationSuccessRate,
    peer_rank: peerRank
  });
}));

export default router;
