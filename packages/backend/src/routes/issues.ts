/**
 * Citizen Issue Routes — /api/v1/issues/*
 * Phase 2: Full implementation of all citizen-facing issue endpoints.
 * Per api_specification.md §3.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { requireCitizen } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  OutsideServiceAreaError,
  ApiError,
} from '../middleware/errorHandler.js';
import { validate, reportIssueSchema, confirmIssueSchema, corroborateIssueSchema, disputeResolutionSchema } from '../middleware/validate.js';
import { strictRateLimit } from '../middleware/rateLimiter.js';
import { getFirestore, getStorage, COLLECTIONS } from '../config/firebase.js';
import { config } from '../config/env.js';
import {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  isWithinServiceArea,
  SLARisk,
  computeSLARiskFull,
} from '@civicmind/shared';
import type { Issue, IssuePhoto, IssueStatusHistory, Department } from '@civicmind/shared';
import type { AuthRequest } from '../middleware/authenticate.js';
import {
  orchestrateIssueSubmission,
  orchestrateIssueConfirmation,
  orchestrateCorroborationDecision,
  transitionIssueStatus,
} from '../services/orchestrator.js';
import { notifyIssueStateChange } from '../services/notificationService.js';
import { ActorType } from '@civicmind/shared';
import type { Request, Response } from 'express';

const router = Router();

// All citizen issue routes require authentication (citizen or guest session)
router.use(authenticate as any);


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the ward_or_area_id from coordinates by matching against seeded
 * jurisdiction mappings. Falls back to "ward_UNKNOWN" if outside all known wards.
 * Assumption: each seeded ward in jurisdiction_mappings has a unique ward_or_area_id.
 */
async function resolveWardFromCoordinates(
  _lat: number,
  _lng: number
): Promise<string> {
  // For the hackathon MVP, we approximate ward resolution using nearest-ward-center
  // (no ward boundary data exists in the schema today).
  const centers = [
    { id: 'ward-101-indiranagar', lat: 12.9784, lng: 77.6408 },
    { id: 'ward-102-koramangala', lat: 12.9352, lng: 77.6245 },
    { id: 'ward-103-hsrlayout', lat: 12.9141, lng: 77.6361 },
  ];

  let nearest = centers[0]!;
  let minDistance = Infinity;

  for (const c of centers) {
    // Simple Euclidean distance is sufficient for small city bounds
    const d = Math.pow(c.lat - _lat, 2) + Math.pow(c.lng - _lng, 2);
    if (d < minDistance) {
      minDistance = d;
      nearest = c;
    }
  }

  return nearest.id;
}

/** Fetches a signed URL for a storage path (public expiry: 15 min) */
async function getSignedUrl(storagePath: string): Promise<string> {
  try {
    const [url] = await getStorage().bucket().file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    return url;
  } catch {
    return storagePath; // fallback: raw path
  }
}

/** Builds a full IssueDetail response object */
async function buildIssueDetail(issue: Issue, isCitizen: boolean) {
  const db = getFirestore();

  // Helper: treat FAILED_PRECONDITION (gRPC code 9 — index still building) as empty result
  function isIndexBuilding(err: any): boolean {
    return err?.code === 9 || String(err?.message ?? '').includes('FAILED_PRECONDITION');
  }

  // Fetch photos
  let photos: { photo_id: string; photo_type: string; url: string }[] = [];
  try {
    const photosSnapshot = await db
      .collection(COLLECTIONS.ISSUE_PHOTOS)
      .where('issue_id', '==', issue.issue_id)
      .get();

    photos = await Promise.all(
      photosSnapshot.docs.map(async (d) => {
        const p = d.data() as IssuePhoto;
        return {
          photo_id: p.photo_id,
          photo_type: p.photo_type,
          url: await getSignedUrl(p.storage_path),
        };
      })
    );
  } catch (err: any) {
    if (!isIndexBuilding(err)) throw err;
    console.warn('[buildIssueDetail] Photos index still building — returning empty photos');
  }

  // Fetch status history (requires composite index on issue_id + created_at)
  let statusHistory: { to_status: string; created_at: string; reason: string | null }[] = [];
  try {
    const historySnapshot = await db
      .collection(COLLECTIONS.ISSUE_STATUS_HISTORY)
      .where('issue_id', '==', issue.issue_id)
      .orderBy('created_at', 'asc')
      .get();

    statusHistory = historySnapshot.docs.map((d) => {
      const h = d.data() as IssueStatusHistory;
      return {
        to_status: h.to_status,
        created_at: h.created_at,
        reason: h.reason ?? null,
      };
    });
  } catch (err: any) {
    if (!isIndexBuilding(err)) throw err;
    console.warn('[buildIssueDetail] Status history index still building — returning empty history');
  }

  // Fetch department name
  let departmentName: string | null = null;
  if (issue.department_id) {
    const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(issue.department_id).get();
    if (deptDoc.exists) departmentName = (deptDoc.data() as Department).name;
  }

  // Privacy: citizen only sees own/public fields (BR-9.2)
  // reporter_user_id is omitted from citizen view per NFR-4
  const base = {
    issue_id: issue.issue_id,
    category: issue.category,
    severity: issue.severity,
    reporter_name: issue.reporter_name,
    status: issue.status,
    location: {
      lat: issue.location_lat,
      lng: issue.location_lng,
      address_text: issue.location_address_text ?? '',
    },
    description: issue.description ?? null,
    photos,
    corroboration_count: issue.corroboration_count,
    department_name: departmentName,
    sla_deadline: issue.sla_deadline ?? null,
    status_history: statusHistory,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };

  if (!isCitizen) {
    return {
      ...base,
      reporter_user_id: issue.reporter_user_id ?? null,
      department_id: issue.department_id ?? null,
      ward_or_area_id: issue.ward_or_area_id,
      escalation_tier_current: issue.escalation_tier_current,
      is_canonical: issue.is_canonical,
      canonical_issue_id: issue.canonical_issue_id ?? null,
      resolved_at: issue.resolved_at ?? null,
      verified_at: issue.verified_at ?? null,
    };
  }

  return base;
}

// ─── POST /api/v1/issues ──────────────────────────────────────────────────────
// Only citizens/guests can submit new reports (api_specification.md §3)
// strictRateLimit: prevents report-spam (10 req/15min per IP in production)
router.post('/', requireCitizen as any, strictRateLimit, validate(reportIssueSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const {
    idempotency_key,
    photo_refs,
    location,
    description,
    manual_category_override,
    manual_severity_override,
  } = req.body as {
    idempotency_key?: string;
    photo_refs?: string[];
    location?: { lat: number; lng: number };
    description?: string | null;
    manual_category_override?: string | null;
    manual_severity_override?: string | null;
  };

  if (!idempotency_key) throw new ValidationError('idempotency_key is required.');
  if (!photo_refs || photo_refs.length === 0) throw new ValidationError('At least one photo_ref is required (BR-1.3).');
  if (!location?.lat || !location?.lng) throw new ValidationError('location.lat and location.lng are required (BR-1.3).');

  // Service area validation (Error Scenario 5.2)
  if (!isWithinServiceArea(location.lat, location.lng, {
    lat_min: config.serviceArea.latMin,
    lat_max: config.serviceArea.latMax,
    lng_min: config.serviceArea.lngMin,
    lng_max: config.serviceArea.lngMax,
  })) {
    throw new OutsideServiceAreaError();
  }

  const wardOrAreaId = await resolveWardFromCoordinates(location.lat, location.lng);

  // For Vision API: load photos from storage as base64
  const photoBase64List: Array<{ mimeType: string; data: string }> = [];
  for (const photoRef of photo_refs) {
    try {
      const bucket = getStorage().bucket();
      const [exists] = await bucket.file(photoRef).exists();
      if (exists) {
        const [buffer] = await bucket.file(photoRef).download();
        photoBase64List.push({ mimeType: 'image/jpeg', data: buffer.toString('base64') });
      }
    } catch {
      // If photo download fails, continue without it (Reporter Agent handles missing photos)
    }
  }

  const result = await orchestrateIssueSubmission({
    idempotencyKey: idempotency_key,
    photoRefs: photo_refs,
    photoBase64List,
    locationLat: location.lat,
    locationLng: location.lng,
    description,
    manualCategoryOverride: manual_category_override,
    manualSeverityOverride: manual_severity_override,
    reporterUserId: user.uid,
    wardOrAreaId,
    locationAddressText: '',
  });

  res.status(201).json({
    issue_id: result.issueId,
    status: result.status,
    suggested_category: result.suggestedCategory,
    category_confidence: result.categoryConfidence,
    suggested_severity: result.suggestedSeverity,
    severity_confidence: result.severityConfidence,
    requires_citizen_confirmation: result.requiresCitizenConfirmation,
  });
}));

// ─── POST /api/v1/issues/:issue_id/confirm ────────────────────────────────────
// Only the reporting citizen can confirm their own issue
router.post('/:issue_id/confirm', requireCitizen as any, validate(confirmIssueSchema), asyncHandler(async (req: Request, res: Response) => {

  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };
  const { confirmed_category, confirmed_severity, description } = req.body as {
    confirmed_category?: string;
    confirmed_severity?: string;
    description?: string | null;
  };

  if (!confirmed_category || !Object.values(IssueCategory).includes(confirmed_category as IssueCategory)) {
    throw new ValidationError(`confirmed_category must be one of: ${Object.values(IssueCategory).join(', ')}`);
  }
  if (!confirmed_severity || !Object.values(IssueSeverity).includes(confirmed_severity as IssueSeverity)) {
    throw new ValidationError(`confirmed_severity must be one of: ${Object.values(IssueSeverity).join(', ')}`);
  }

  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;

  // Only the reporter (or guest session owner) can confirm
  if (issue.reporter_user_id && issue.reporter_user_id !== user.uid) {
    throw new ForbiddenError('Only the reporting user can confirm this issue.');
  }

  // Can only confirm from submitted status
  if (issue.status !== IssueStatus.Submitted) {
    throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Issue has already been confirmed.');
  }

  // Persist description if provided at confirmation step (BR-1.2: optional field)
  if (description !== undefined && description !== null && description.trim().length > 0) {
    await db.collection(COLLECTIONS.ISSUES).doc(issue_id).update({
      description: description.trim().slice(0, 500),
      updated_at: new Date().toISOString(),
    });
  }

  const result = await orchestrateIssueConfirmation({
    issueId: issue_id,
    confirmedCategory: confirmed_category as IssueCategory,
    confirmedSeverity: confirmed_severity as IssueSeverity,
    citizenUserId: user.uid,
  });

  res.status(200).json({
    issue_id: result.issueId,
    status: result.status,
    duplicate_candidate: result.duplicateCandidate
      ? {
        issue_id: result.duplicateCandidate.issueId,
        match_confidence: result.duplicateCandidate.matchConfidence,
      }
      : null,
  });
}));

// ─── POST /api/v1/issues/:issue_id/corroborate ────────────────────────────────
// Only citizens can corroborate issues (api_specification.md §3)
router.post('/:issue_id/corroborate', requireCitizen as any, strictRateLimit, validate(corroborateIssueSchema), asyncHandler(async (req: Request, res: Response) => {

  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };
  const { is_same_issue } = req.body as { is_same_issue?: boolean };

  if (typeof is_same_issue !== 'boolean') {
    throw new ValidationError('is_same_issue must be a boolean.');
  }

  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;
  if (issue.status !== IssueStatus.DuplicateCandidate) {
    throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Issue is not awaiting corroboration confirmation.');
  }

  const result = await orchestrateCorroborationDecision({
    newIssueId: issue_id,
    isSameIssue: is_same_issue,
    citizenUserId: user.uid,
  });

  res.status(200).json({
    result: result.result,
    canonical_issue_id: result.canonicalIssueId,
  });
}));

// ─── GET /api/v1/issues/:issue_id ────────────────────────────────────────────
router.get('/:issue_id', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };

  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;
  // For this hackathon/demo, we allow all users (including unauthenticated) 
  // to view full issue details so they can see the Vibe Coding rich data.
  // We still pass isCitizen=true to strip `reporter_user_id` in buildIssueDetail.
  const isCitizen = user?.role === 'citizen' || !user;

  const detail = await buildIssueDetail(issue, isCitizen);
  res.status(200).json(detail);
}));

// ─── GET /api/v1/issues ──────────────────────────────────────────────────────
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = (req as AuthRequest).user;
  const {
    status,
    category,
    severity,
    mine,
    limit: limitStr,
    cursor,
  } = req.query as {
    status?: string;
    category?: string;
    severity?: string;
    mine?: string;
    limit?: string;
    cursor?: string;
  };

  const db = getFirestore();
  const pageLimit = Math.min(parseInt(limitStr ?? '50', 10), 200);

  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.ISSUES)
    .where('is_canonical', '==', true)
    .orderBy('created_at', 'desc')
    .limit(pageLimit + 1);

  // Filter to own issues ONLY if citizen explicitly requests "mine"
  if (mine === 'true') {
    query = query.where('reporter_user_id', '==', user.uid);
  }

  if (status && Object.values(IssueStatus).includes(status as IssueStatus)) {
    query = query.where('status', '==', status);
  }
  if (category && Object.values(IssueCategory).includes(category as IssueCategory)) {
    query = query.where('category', '==', category);
  }
  if (severity && Object.values(IssueSeverity).includes(severity as IssueSeverity)) {
    query = query.where('severity', '==', severity);
  }

  // Cursor pagination
  if (cursor) {
    try {
      const cursorDoc = await db.collection(COLLECTIONS.ISSUES).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    } catch { /* invalid cursor — ignore */ }
  }

  let snapshot: FirebaseFirestore.QuerySnapshot;
  try {
    snapshot = await query.get();
  } catch (err: any) {
    if (err?.code === 9 || String(err?.message ?? '').includes('FAILED_PRECONDITION')) {
      console.warn('[GET /issues] Feed index still building — returning empty feed');
      res.status(200).json({ issues: [], has_more: false, next_cursor: null });
      return;
    }
    throw err;
  }
  const hasMore = snapshot.docs.length > pageLimit;
  const docs = hasMore ? snapshot.docs.slice(0, pageLimit) : snapshot.docs;

  const issues = await Promise.all(
    docs.map(async (d) => {
      const issue = d.data() as Issue;
      let departmentName: string | null = null;
      if (issue.department_id) {
        const deptDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(issue.department_id).get();
        if (deptDoc.exists) departmentName = (deptDoc.data() as Department).name;
      }

      let slaRisk: SLARisk | null = null;
      if (issue.sla_deadline && issue.status === IssueStatus.Routed) {
        try {
          const routedHistorySnapshot = await db
            .collection(COLLECTIONS.ISSUE_STATUS_HISTORY)
            .where('issue_id', '==', issue.issue_id)
            .where('to_status', '==', IssueStatus.Routed)
            .limit(1)
            .get();
          if (!routedHistorySnapshot.empty) {
            const routedAt = new Date(routedHistorySnapshot.docs[0]!.data()['created_at'] as string);
            slaRisk = computeSLARiskFull(routedAt, new Date(issue.sla_deadline));
          }
        } catch (slaErr: any) {
          if (slaErr?.code !== 9 && !String(slaErr?.message ?? '').includes('FAILED_PRECONDITION')) throw slaErr;
          // Index still building — skip SLA risk for this item
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
        department_name: departmentName,
        sla_deadline: issue.sla_deadline ?? null,
        sla_risk: slaRisk,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    })
  );

  res.status(200).json({
    issues,
    next_cursor: hasMore ? docs[docs.length - 1]!.id : null,
  });
}));

// ─── POST /api/v1/issues/:issue_id/dispute-resolution ─────────────────────────
// Only original reporting citizen can dispute a resolution (api_specification.md §3)
router.post('/:issue_id/dispute-resolution', requireCitizen as any, validate(disputeResolutionSchema), asyncHandler(async (req: Request, res: Response) => {

  const user = (req as AuthRequest).user;
  const { issue_id } = req.params as { issue_id: string };
  const { reason } = req.body as { reason?: string | null };

  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(issue_id).get();
  if (!issueDoc.exists) throw new NotFoundError('Issue');

  const issue = issueDoc.data() as Issue;

  // Only original reporter can dispute
  if (issue.reporter_user_id !== user.uid) {
    throw new ForbiddenError('Only the original reporter can dispute a resolution.');
  }

  // Must be in verified_resolved or inconclusive status
  if (
    issue.status !== IssueStatus.VerifiedResolved &&
    issue.status !== IssueStatus.Inconclusive
  ) {
    throw new ApiError(409, 'INVALID_STATE_TRANSITION', 'Issue is not in a state that allows citizen dispute.');
  }

  // Check dispute window (BR-5.3: 7 days from verified_at)
  if (issue.verified_at) {
    const verifiedAt = new Date(issue.verified_at);
    const windowMs = (config as any).disputeWindowDays
      ? (config as any).disputeWindowDays * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - verifiedAt.getTime() > windowMs) {
      throw new ApiError(409, 'DISPUTE_WINDOW_EXPIRED', 'The dispute window for this issue has expired.');
    }
  }

  await transitionIssueStatus({
    issueId: issue_id,
    fromStatus: issue.status,
    toStatus: IssueStatus.DisputedResolution,
    actorType: ActorType.Citizen,
    actorId: user.uid,
    reason: reason ?? 'Citizen disputes the resolution.',
  });

  // Reopen and route back
  await transitionIssueStatus({
    issueId: issue_id,
    fromStatus: IssueStatus.DisputedResolution,
    toStatus: IssueStatus.Routed,
    actorType: ActorType.System,
    reason: 'Citizen-initiated dispute. Issue reopened and re-routed to department.',
  });

  await notifyIssueStateChange({
    issueId: issue_id,
    reporterUserId: issue.reporter_user_id,
    newStatus: IssueStatus.DisputedResolution,
  });

  res.status(200).json({
    issue_id: issue_id,
    status: IssueStatus.Routed,
  });
}));

export default router;
