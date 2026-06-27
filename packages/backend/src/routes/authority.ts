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

export default router;
