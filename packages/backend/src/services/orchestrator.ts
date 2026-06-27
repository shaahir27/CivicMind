/**
 * Issue Orchestrator
 *
 * The ONLY component that:
 * 1. Enforces canonical state machine transitions (validates before any write)
 * 2. Sequences agent invocations in the correct pipeline order
 * 3. Persists state transitions atomically (or rolls back to safe state on failure)
 * 4. Emits notifications on every state change
 *
 * Per system_architecture.md §3.1:
 *   "The orchestrator is the *only* component that talks to every agent.
 *    Agents do not call each other directly."
 *
 * Architectural principle: If an agent call fails mid-pipeline, the issue falls
 * back to the last safe state rather than being left in an ambiguous state.
 */

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';
import {
  IssueStatus,
  IssueCategory,
  IssueSeverity,
  ActorType,
  AgentType,
  isValidStatusTransition,
  computeSLADeadline,
  CORROBORATION_SEVERITY_THRESHOLD,
  VALID_STATUS_TRANSITIONS,
  UserRole,
} from '@civicmind/shared';
import type { Issue, IssueStatusHistory, IssuePhoto, Corroboration, User } from '@civicmind/shared';
import { runReporterAgent } from '../agents/reporterAgent.js';
import type { PhotoForVision } from '../agents/reporterAgent.js';
import { runValidatorAgent } from '../agents/validatorAgent.js';
import { runRouterAgent } from '../agents/routerAgent.js';
import { runVerifierAgent } from '../agents/verifierAgent.js';
import { writeAuditLog } from './auditLog.js';
import { notifyIssueStateChange } from './notificationService.js';
import { InvalidStateTransitionError, ValidationError, ApiError } from '../middleware/errorHandler.js';

// ─── State machine enforcement ────────────────────────────────────────────────

/**
 * Validates and writes a single status transition.
 * Throws InvalidStateTransitionError if the transition is not in the canonical machine.
 * Writes an IssueStatusHistory entry (append-only).
 * Updates the Issue document's status + updated_at.
 *
 * This is the ONLY place status transitions are written — callers must use this function.
 */
export async function transitionIssueStatus({
  issueId,
  fromStatus,
  toStatus,
  actorType,
  actorId,
  reason,
  extraFields,
}: {
  issueId: string;
  fromStatus: IssueStatus;
  toStatus: IssueStatus;
  actorType: ActorType;
  actorId?: string | null;
  reason?: string | null;
  extraFields?: Partial<Issue>;
}): Promise<void> {
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    throw new InvalidStateTransitionError(fromStatus, toStatus);
  }

  const db = getFirestore();
  const now = new Date().toISOString();
  const historyId = uuidv4();

  const batch = db.batch();

  // 1. Append to IssueStatusHistory (immutable)
  const historyRef = db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc(historyId);
  const historyEntry: IssueStatusHistory = {
    history_id: historyId,
    issue_id: issueId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_type: actorType,
    actor_id: actorId ?? null,
    reason: reason ?? null,
    created_at: now,
  };
  batch.set(historyRef, historyEntry);

  // 2. Update Issue status + timestamp
  const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issueId);
  const issueUpdate: Partial<Issue> & { updated_at: string; status: IssueStatus } = {
    status: toStatus,
    updated_at: now,
    ...extraFields,
  };

  // Set resolved_at / verified_at on terminal transitions
  if (toStatus === IssueStatus.Resolved) issueUpdate.resolved_at = now;
  if (toStatus === IssueStatus.VerifiedResolved) issueUpdate.verified_at = now;

  batch.update(issueRef, issueUpdate);

  await batch.commit();
}

// ─── Pipeline: Submit → Reporter → (return to client for confirmation) ─────────

export interface SubmitIssueInput {
  idempotencyKey: string;
  photoRefs: string[];            // storage paths
  photoBase64List: PhotoForVision[];
  locationLat: number;
  locationLng: number;
  description?: string | null;
  manualCategoryOverride?: string | null;
  manualSeverityOverride?: string | null;
  reporterUserId: string;
  wardOrAreaId: string;
  locationAddressText?: string;
}

export interface SubmitIssueResult {
  issueId: string;
  status: IssueStatus;
  suggestedCategory: IssueCategory;
  categoryConfidence: number;
  suggestedSeverity: IssueSeverity;
  severityConfidence: number;
  requiresCitizenConfirmation: boolean;
}

/**
 * Step 1 of the citizen report flow.
 * Creates the Issue record in `submitted` state and runs the Reporter Agent.
 * Returns classification result to the client for confirmation (two-step flow per user_flows.md §2).
 */
export async function orchestrateIssueSubmission(
  input: SubmitIssueInput
): Promise<SubmitIssueResult> {
  const db = getFirestore();

  // Idempotency: check if a record already exists for this key
  const existingSnapshot = await db
    .collection(COLLECTIONS.ISSUES)
    .where('idempotency_key', '==', input.idempotencyKey)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    const existing = existingSnapshot.docs[0]!.data() as Issue & { idempotency_key: string };
    return {
      issueId: existing.issue_id,
      status: existing.status,
      suggestedCategory: existing.category,
      categoryConfidence: existing.category_confidence,
      suggestedSeverity: existing.severity,
      severityConfidence: existing.severity_confidence,
      requiresCitizenConfirmation: existing.category_confidence < 0.6,
    };
  }

  // Run Reporter Agent with Fallback
  let reporterResult: { isCivicIssue: boolean; suggestedCategory: IssueCategory; categoryConfidence: number; suggestedSeverity: IssueSeverity; severityConfidence: number; } | null = null;
  try {
    reporterResult = await runReporterAgent({
      photoBase64List: input.photoBase64List,
      description: input.description,
    });
    
    // Check if the AI determined this is not a valid civic issue
    if (reporterResult && !reporterResult.isCivicIssue && !input.manualCategoryOverride) {
      const error = new ValidationError('This image does not appear to be a valid civic issue. Please upload a relevant photo.');
      error.code = 'INVALID_CIVIC_ISSUE';
      throw error;
    }
  } catch (err: any) {
    console.error('Reporter Agent failed:', err);
    // If agent fails due to INVALID_CIVIC_ISSUE, rethrow it so the client gets it
    if (err.code === 'INVALID_CIVIC_ISSUE') {
      throw err;
    }
    // If agent fails and NO manual overrides provided, fail loudly
    if (!input.manualCategoryOverride || !input.manualSeverityOverride) {
      throw new ApiError(422, 'AI_UNAVAILABLE', 'AI analysis failed. Please provide category and severity manually.');
    }
  }

  // Apply manual override if provided
  const finalCategory = (input.manualCategoryOverride &&
    Object.values(IssueCategory).includes(input.manualCategoryOverride as IssueCategory))
    ? (input.manualCategoryOverride as IssueCategory)
    : (reporterResult?.suggestedCategory ?? IssueCategory.Other);

  const finalSeverity = (input.manualSeverityOverride &&
    Object.values(IssueSeverity).includes(input.manualSeverityOverride as IssueSeverity))
    ? (input.manualSeverityOverride as IssueSeverity)
    : (reporterResult?.suggestedSeverity ?? IssueSeverity.Low);

  const categoryConfidence = input.manualCategoryOverride ? 1.0 : (reporterResult?.categoryConfidence ?? 1.0);
  const severityConfidence = input.manualSeverityOverride ? 1.0 : (reporterResult?.severityConfidence ?? 1.0);

  const issueId = uuidv4();
  const now = new Date().toISOString();

  // Create the Issue document
  const issueDoc: Issue & { idempotency_key: string; drafted_complaint?: string } = {
    issue_id: issueId,
    reporter_user_id: input.reporterUserId,
    category: finalCategory,
    category_confidence: categoryConfidence,
    severity: finalSeverity,
    severity_confidence: severityConfidence,
    description: input.description ?? null,
    location_lat: input.locationLat,
    location_lng: input.locationLng,
    location_address_text: input.locationAddressText ?? '',
    ward_or_area_id: input.wardOrAreaId,
    status: IssueStatus.Submitted,
    department_id: null,
    sla_deadline: null,
    escalation_tier_current: 0,
    corroboration_count: 1,
    is_canonical: true,
    canonical_issue_id: null,
    hotspot_forecast_id: null,
    created_at: now,
    updated_at: now,
    resolved_at: null,
    verified_at: null,
    idempotency_key: input.idempotencyKey,
  };

  const batch = db.batch();

  batch.set(db.collection(COLLECTIONS.ISSUES).doc(issueId), issueDoc);

  // Write initial status history entry
  const historyId = uuidv4();
  batch.set(db.collection(COLLECTIONS.ISSUE_STATUS_HISTORY).doc(historyId), {
    history_id: historyId,
    issue_id: issueId,
    from_status: null,
    to_status: IssueStatus.Submitted,
    actor_type: ActorType.Citizen,
    actor_id: input.reporterUserId,
    reason: 'Initial submission',
    created_at: now,
  } as IssueStatusHistory);

  // Write photo records
  for (const photoRef of input.photoRefs) {
    const photoId = uuidv4();
    batch.set(db.collection(COLLECTIONS.ISSUE_PHOTOS).doc(photoId), {
      photo_id: photoId,
      issue_id: issueId,
      photo_type: 'before',
      storage_path: photoRef,
      uploaded_by_user_id: input.reporterUserId,
      created_at: now,
    } as IssuePhoto);
  }

  // Commit issue + history + photos atomically — either all of it lands or none of it does.
  await batch.commit();

  // Audit log for Reporter Agent
  await writeAuditLog({
    issueId,
    agentType: AgentType.Reporter,
    inputSummary: reporterResult ? (reporterResult as any).inputSummary : 'Manual submission',
    outputSummary: reporterResult ? (reporterResult as any).outputSummary : 'No AI output',
    confidenceScore: reporterResult ? reporterResult.categoryConfidence : 1.0,
    agentVersion: reporterResult ? (reporterResult as any).agentVersion : '1.0',
  });

  const requiresConfirmation = reporterResult ? reporterResult.categoryConfidence < 0.6 : false;

  return {
    issueId,
    status: IssueStatus.Submitted,
    suggestedCategory: finalCategory,
    categoryConfidence: reporterResult ? reporterResult.categoryConfidence : 1.0,
    suggestedSeverity: reporterResult ? reporterResult.suggestedSeverity : IssueSeverity.Low,
    severityConfidence: reporterResult ? reporterResult.severityConfidence : 1.0,
    requiresCitizenConfirmation: requiresConfirmation,
  };
}

// ─── Pipeline: Confirm → Validator → (branch) → Router ───────────────────────

export interface ConfirmIssueInput {
  issueId: string;
  confirmedCategory: IssueCategory;
  confirmedSeverity: IssueSeverity;
  citizenUserId: string;
}

export interface ConfirmIssueResult {
  issueId: string;
  status: IssueStatus;
  duplicateCandidate: { issueId: string; matchConfidence: number } | null;
}

/**
 * Step 2 of the citizen report flow.
 * Citizen confirms or overrides classification → triggers Validator Agent → if unique, triggers Router Agent.
 */
export async function orchestrateIssueConfirmation(
  input: ConfirmIssueInput
): Promise<ConfirmIssueResult> {
  const db = getFirestore();
  const issueRef = db.collection(COLLECTIONS.ISSUES).doc(input.issueId);
  const issueDoc = await issueRef.get();

  if (!issueDoc.exists) {
    throw new Error(`Issue not found: ${input.issueId}`);
  }

  const issue = issueDoc.data() as Issue;

  // Update category/severity with citizen's confirmed values
  const now = new Date().toISOString();
  await issueRef.update({
    category: input.confirmedCategory,
    severity: input.confirmedSeverity,
    updated_at: now,
  });

  // Transition to validating
  await transitionIssueStatus({
    issueId: input.issueId,
    fromStatus: issue.status,
    toStatus: IssueStatus.Validating,
    actorType: ActorType.Citizen,
    actorId: input.citizenUserId,
    reason: 'Citizen confirmed classification; validation started.',
  });

  await notifyIssueStateChange({
    issueId: input.issueId,
    reporterUserId: issue.reporter_user_id,
    newStatus: IssueStatus.Validating,
  });

  // Fetch photo storage paths for validator
  const photosSnapshot = await db
    .collection(COLLECTIONS.ISSUE_PHOTOS)
    .where('issue_id', '==', input.issueId)
    .get();
  const photoStoragePaths = photosSnapshot.docs.map(d => (d.data() as IssuePhoto).storage_path);

  // Run Validator Agent
  const validatorResult = await runValidatorAgent({
    newIssueId: input.issueId,
    category: input.confirmedCategory,
    locationLat: issue.location_lat,
    locationLng: issue.location_lng,
    wardOrAreaId: issue.ward_or_area_id,
    photoStoragePaths,
  });

  // Audit log
  await writeAuditLog({
    issueId: input.issueId,
    agentType: AgentType.Validator,
    inputSummary: validatorResult.inputSummary,
    outputSummary: validatorResult.outputSummary,
    confidenceScore: validatorResult.matchConfidence,
    agentVersion: validatorResult.agentVersion,
  });

  if (validatorResult.action === 'auto_merge' && validatorResult.matchedIssueId) {
    // Auto-merge as corroboration (BR-2.2)
    await mergeAsCorroboration({
      newIssueId: input.issueId,
      canonicalIssueId: validatorResult.matchedIssueId,
      matchConfidence: validatorResult.matchConfidence,
      corroboratingUserId: input.citizenUserId,
    });

    return {
      issueId: validatorResult.matchedIssueId,
      status: IssueStatus.Routed,
      duplicateCandidate: null,
    };
  }

  if (validatorResult.action === 'prompt_confirm' && validatorResult.matchedIssueId) {
    // Prompt citizen to confirm (BR-2.3)
    const updatedIssue = await issueRef.get();
    await transitionIssueStatus({
      issueId: input.issueId,
      fromStatus: (updatedIssue.data() as Issue).status,
      toStatus: IssueStatus.DuplicateCandidate,
      actorType: ActorType.AgentValidator,
      reason: `Potential duplicate found with ${Math.round(validatorResult.matchConfidence * 100)}% confidence. Citizen confirmation required.`,
    });

    await notifyIssueStateChange({
      issueId: input.issueId,
      reporterUserId: issue.reporter_user_id,
      newStatus: IssueStatus.DuplicateCandidate,
    });

    return {
      issueId: input.issueId,
      status: IssueStatus.DuplicateCandidate,
      duplicateCandidate: {
        issueId: validatorResult.matchedIssueId,
        matchConfidence: validatorResult.matchConfidence,
      },
    };
  }

  // Unique — proceed to routing
  const refreshedIssue = (await issueRef.get()).data() as Issue;
  await transitionIssueStatus({
    issueId: input.issueId,
    fromStatus: refreshedIssue.status,
    toStatus: IssueStatus.Routing,
    actorType: ActorType.AgentValidator,
    reason: 'No duplicate found. Routing to appropriate department.',
  });

  // Run Router Agent
  const updatedIssue = (await issueRef.get()).data() as Issue;
  const routerResult = await runRouterAgent({
    issueId: input.issueId,
    category: input.confirmedCategory,
    severity: input.confirmedSeverity,
    wardOrAreaId: issue.ward_or_area_id,
    locationAddressText: issue.location_address_text ?? '',
    locationLat: issue.location_lat,
    locationLng: issue.location_lng,
    description: issue.description,
    corroborationCount: issue.corroboration_count,
    createdAt: issue.created_at,
  });

  await writeAuditLog({
    issueId: input.issueId,
    agentType: AgentType.Router,
    inputSummary: routerResult.inputSummary,
    outputSummary: routerResult.outputSummary,
    confidenceScore: null,
    agentVersion: routerResult.agentVersion,
  });

  const slaDeadline = computeSLADeadline(new Date(), routerResult.slaHours).toISOString();

  await transitionIssueStatus({
    issueId: input.issueId,
    fromStatus: updatedIssue.status,
    toStatus: IssueStatus.Routed,
    actorType: ActorType.AgentRouter,
    reason: `Routed to ${routerResult.departmentName}. SLA: ${routerResult.slaHours}h.`,
    extraFields: {
      department_id: routerResult.departmentId,
      sla_deadline: slaDeadline,
    },
  });

  // Award hero points to reporter (BR-10.1: points awarded at routed status)
  if (issue.reporter_user_id && !issue.reporter_user_id.startsWith('guest-')) {
    await awardHeroPoints(issue.reporter_user_id, input.issueId, 'routed');
  }

  await notifyIssueStateChange({
    issueId: input.issueId,
    reporterUserId: issue.reporter_user_id,
    newStatus: IssueStatus.Routed,
    departmentName: routerResult.departmentName,
  });

  return {
    issueId: input.issueId,
    status: IssueStatus.Routed,
    duplicateCandidate: null,
  };
}

// ─── Pipeline: Corroboration decision ────────────────────────────────────────

export async function orchestrateCorroborationDecision({
  newIssueId,
  isSameIssue,
  citizenUserId,
}: {
  newIssueId: string;
  isSameIssue: boolean;
  citizenUserId: string;
}): Promise<{ result: 'merged_as_corroboration' | 'created_as_new'; canonicalIssueId: string }> {
  const db = getFirestore();
  const issueDoc = await db.collection(COLLECTIONS.ISSUES).doc(newIssueId).get();

  if (!issueDoc.exists) throw new Error(`Issue not found: ${newIssueId}`);

  const issue = issueDoc.data() as Issue;

  if (!isSameIssue) {
    // Citizen says different issue — treat as unique, run routing
    const routerResult = await runRouterAgent({
      issueId: newIssueId,
      category: issue.category,
      severity: issue.severity,
      wardOrAreaId: issue.ward_or_area_id,
      locationAddressText: issue.location_address_text ?? '',
      locationLat: issue.location_lat,
      locationLng: issue.location_lng,
      description: issue.description,
      corroborationCount: issue.corroboration_count,
      createdAt: issue.created_at,
    });

    await writeAuditLog({
      issueId: newIssueId,
      agentType: AgentType.Router,
      inputSummary: routerResult.inputSummary,
      outputSummary: routerResult.outputSummary,
      confidenceScore: null,
      agentVersion: routerResult.agentVersion,
    });

    const slaDeadline = computeSLADeadline(new Date(), routerResult.slaHours).toISOString();

    await transitionIssueStatus({
      issueId: newIssueId,
      fromStatus: issue.status,
      toStatus: IssueStatus.Routing,
      actorType: ActorType.Citizen,
      actorId: citizenUserId,
      reason: 'Citizen confirmed this is a different issue — routing independently.',
    });

    await transitionIssueStatus({
      issueId: newIssueId,
      fromStatus: IssueStatus.Routing,
      toStatus: IssueStatus.Routed,
      actorType: ActorType.AgentRouter,
      reason: `Routed to ${routerResult.departmentName}.`,
      extraFields: {
        department_id: routerResult.departmentId,
        sla_deadline: slaDeadline,
      },
    });

    return { result: 'created_as_new', canonicalIssueId: newIssueId };
  }

  // Find the duplicate candidate from recent audit logs
  // Fetching all matching logs and sorting in memory to avoid index requirements
  const auditSnapshot = await db
    .collection(COLLECTIONS.AGENT_DECISION_LOG)
    .where('issue_id', '==', newIssueId)
    .where('agent_type', '==', AgentType.Validator)
    .get();

  const auditDocs = auditSnapshot.docs.map(d => d.data());
  auditDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (auditDocs.length === 0) {
    throw new Error('No validator decision found for this issue — cannot corroborate');
  }

  const auditData = auditDocs[0]!;
  const outputData = JSON.parse(auditData['output_summary'] as string) as { matched_issue_id?: string };
  const canonicalIssueId = outputData.matched_issue_id;

  if (!canonicalIssueId) throw new Error('No matched_issue_id in validator output');

  await mergeAsCorroboration({
    newIssueId,
    canonicalIssueId,
    matchConfidence: auditData['confidence_score'] as number ?? 0.5,
    corroboratingUserId: citizenUserId,
  });

  return { result: 'merged_as_corroboration', canonicalIssueId };
}

// ─── Helper: merge as corroboration ──────────────────────────────────────────

async function mergeAsCorroboration({
  newIssueId,
  canonicalIssueId,
  matchConfidence,
  corroboratingUserId,
}: {
  newIssueId: string;
  canonicalIssueId: string;
  matchConfidence: number;
  corroboratingUserId?: string | null;
}): Promise<void> {
  const db = getFirestore();
  const now = new Date().toISOString();

  // Mark new issue as non-canonical
  await db.collection(COLLECTIONS.ISSUES).doc(newIssueId).update({
    is_canonical: false,
    canonical_issue_id: canonicalIssueId,
    status: IssueStatus.Closed,
    updated_at: now,
  });

  // Write corroboration record
  const corroborationId = uuidv4();
  await db.collection(COLLECTIONS.CORROBORATIONS).doc(corroborationId).set({
    corroboration_id: corroborationId,
    canonical_issue_id: canonicalIssueId,
    corroborating_user_id: corroboratingUserId ?? null,
    original_submitted_issue_id: newIssueId,
    match_confidence: matchConfidence,
    created_at: now,
  } as Corroboration);

  // Increment corroboration count on canonical issue
  const canonicalRef = db.collection(COLLECTIONS.ISSUES).doc(canonicalIssueId);
  const canonicalDoc = await canonicalRef.get();

  if (canonicalDoc.exists) {
    const canonical = canonicalDoc.data() as Issue;
    const newCount = canonical.corroboration_count + 1;

    const updates: Partial<Issue> = {
      corroboration_count: newCount,
      updated_at: now,
    };

    // BR-2.4: Auto re-escalate severity if ≥ 5 corroborations and severity is not already high/critical
    if (newCount >= CORROBORATION_SEVERITY_THRESHOLD &&
        (canonical.severity === 'low' || canonical.severity === 'medium')) {
      updates.severity = IssueSeverity.High;
    }

    await canonicalRef.update(updates);
  }
}

// ─── Pipeline: Authority status update → Verifier ─────────────────────────────

export async function orchestrateAuthorityStatusUpdate({
  issueId,
  newStatus,
  afterPhotoStoragePath,
  authorityUserId,
}: {
  issueId: string;
  newStatus: 'in_progress' | 'resolved';
  afterPhotoStoragePath?: string | null;
  authorityUserId: string;
}): Promise<{ issueId: string; status: IssueStatus }> {
  const db = getFirestore();
  const issueRef = db.collection(COLLECTIONS.ISSUES).doc(issueId);
  const issueDoc = await issueRef.get();
  if (!issueDoc.exists) throw new Error(`Issue not found: ${issueId}`);

  const issue = issueDoc.data() as Issue;

  if (newStatus === 'in_progress') {
    await transitionIssueStatus({
      issueId,
      fromStatus: issue.status,
      toStatus: IssueStatus.InProgress,
      actorType: ActorType.Authority,
      actorId: authorityUserId,
    });

    await notifyIssueStateChange({
      issueId,
      reporterUserId: issue.reporter_user_id,
      newStatus: IssueStatus.InProgress,
      departmentName: null,
    });

    return { issueId, status: IssueStatus.InProgress };
  }

  // resolved — requires after-photo (BR-5.1)
  if (!afterPhotoStoragePath) {
    throw new Error('MISSING_REQUIRED_EVIDENCE: An after-photo is required to mark an issue as resolved.');
  }

  // Record after-photo
  const photoId = uuidv4();
  const now = new Date().toISOString();
  await db.collection(COLLECTIONS.ISSUE_PHOTOS).doc(photoId).set({
    photo_id: photoId,
    issue_id: issueId,
    photo_type: 'after',
    storage_path: afterPhotoStoragePath,
    uploaded_by_user_id: authorityUserId,
    created_at: now,
  } as IssuePhoto);

  // Transition to resolved
  await transitionIssueStatus({
    issueId,
    fromStatus: issue.status,
    toStatus: IssueStatus.Resolved,
    actorType: ActorType.Authority,
    actorId: authorityUserId,
    reason: 'Authority marked issue as resolved and submitted after-photo.',
  });

  await notifyIssueStateChange({
    issueId,
    reporterUserId: issue.reporter_user_id,
    newStatus: IssueStatus.Resolved,
  });

  // Automatically transition to verifying
  await transitionIssueStatus({
    issueId,
    fromStatus: IssueStatus.Resolved,
    toStatus: IssueStatus.Verifying,
    actorType: ActorType.System,
    reason: 'Automatically triggering Verifier Agent for before/after comparison.',
  });

  await notifyIssueStateChange({
    issueId,
    reporterUserId: issue.reporter_user_id,
    newStatus: IssueStatus.Verifying,
  });

  // Fetch before-photo
  const beforePhotosSnapshot = await db
    .collection(COLLECTIONS.ISSUE_PHOTOS)
    .where('issue_id', '==', issueId)
    .where('photo_type', '==', 'before')
    .limit(1)
    .get();

  if (beforePhotosSnapshot.empty) {
    console.warn(`[Orchestrator] No before-photo found for issue ${issueId} — defaulting to inconclusive`);
    await transitionIssueStatus({
      issueId,
      fromStatus: IssueStatus.Verifying,
      toStatus: IssueStatus.Inconclusive,
      actorType: ActorType.AgentVerifier,
      reason: 'No before-photo found for comparison. Manual review required.',
    });
    return { issueId, status: IssueStatus.Inconclusive };
  }

  const beforeStoragePath = (beforePhotosSnapshot.docs[0]!.data() as IssuePhoto).storage_path;

  // Run Verifier Agent
  const verifierResult = await runVerifierAgent({
    issueId,
    category: issue.category,
    beforePhotoStoragePath: beforeStoragePath,
    afterPhotoStoragePath,
  });

  await writeAuditLog({
    issueId,
    agentType: AgentType.Verifier,
    inputSummary: verifierResult.inputSummary,
    outputSummary: verifierResult.outputSummary,
    confidenceScore: verifierResult.confidence,
    agentVersion: verifierResult.agentVersion,
  });

  // Map VerificationResult to IssueStatus
  const statusMap: Record<string, IssueStatus> = {
    verified_resolved: IssueStatus.VerifiedResolved,
    inconclusive: IssueStatus.Inconclusive,
    disputed_resolution: IssueStatus.DisputedResolution,
  };
  const finalStatus = statusMap[verifierResult.result] ?? IssueStatus.Inconclusive;

  await transitionIssueStatus({
    issueId,
    fromStatus: IssueStatus.Verifying,
    toStatus: finalStatus,
    actorType: ActorType.AgentVerifier,
    reason: `Verifier Agent: ${verifierResult.rationale} (confidence: ${Math.round(verifierResult.confidence * 100)}%)`,
  });

  // Award bonus hero points for verified_resolved (BR-10.2)
  if (finalStatus === IssueStatus.VerifiedResolved && issue.reporter_user_id) {
    await awardHeroPoints(issue.reporter_user_id, issueId, 'verified_resolved_bonus');
  }

  await notifyIssueStateChange({
    issueId,
    reporterUserId: issue.reporter_user_id,
    newStatus: finalStatus,
  });

  // If disputed, reopen and route back
  if (finalStatus === IssueStatus.DisputedResolution) {
    await transitionIssueStatus({
      issueId,
      fromStatus: IssueStatus.DisputedResolution,
      toStatus: IssueStatus.Routed,
      actorType: ActorType.System,
      reason: 'Resolution disputed — issue reopened and routed back to department for re-resolution.',
    });
    return { issueId, status: IssueStatus.Routed };
  }

  return { issueId, status: finalStatus };
}

// ─── Hero Points ──────────────────────────────────────────────────────────────

async function awardHeroPoints(
  userId: string,
  issueId: string,
  reason: 'routed' | 'verified_resolved_bonus'
): Promise<void> {
  const db = getFirestore();
  const points = reason === 'routed' ? 10 : 25;
  const ledgerId = uuidv4();
  const now = new Date().toISOString();

  try {
    // Idempotency: check if already awarded for this event
    const existingSnapshot = await db
      .collection(COLLECTIONS.HERO_POINTS_LEDGER)
      .where('user_id', '==', userId)
      .where('issue_id', '==', issueId)
      .where('reason', '==', reason)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) return; // Already awarded

    const batch = db.batch();

    // Ledger entry
    batch.set(db.collection(COLLECTIONS.HERO_POINTS_LEDGER).doc(ledgerId), {
      ledger_id: ledgerId,
      user_id: userId,
      issue_id: issueId,
      points,
      reason,
      created_at: now,
    });

    // Update denormalized balance on user doc
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    batch.update(userRef, {
      hero_points_balance: (await userRef.get()).data()?.['hero_points_balance'] as number + points,
      updated_at: now,
    } as Partial<User>);

    await batch.commit();
  } catch (err) {
    console.error('[Orchestrator] Failed to award hero points:', err);
    // Non-critical: don't let this fail the main pipeline
  }
}

// Re-export types needed by route handlers
export { VALID_STATUS_TRANSITIONS, IssueStatus, UserRole };
