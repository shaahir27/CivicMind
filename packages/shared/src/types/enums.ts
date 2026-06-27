/**
 * CivicMind — Canonical Enums
 *
 * These enums are the single source of truth for all status values,
 * categories, and role definitions used across the entire platform.
 * They map directly to database_design.md and user_flows.md.
 */

// ─── Issue Category ──────────────────────────────────────────────────────────
// Per database_design.md §2.4 and feature_specifications.md Feature 1
export enum IssueCategory {
  Pothole = 'pothole',
  Streetlight = 'streetlight',
  Garbage = 'garbage',
  WaterLeakage = 'water_leakage',
  TrafficSignal = 'traffic_signal',
  Drainage = 'drainage',
  RoadDamage = 'road_damage',
  Other = 'other',
}

// ─── Issue Severity ──────────────────────────────────────────────────────────
export enum IssueSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// ─── Issue Status — Canonical State Machine ──────────────────────────────────
// Per user_flows.md canonical state machine.
// Transitions enforced at orchestrator/API layer, NOT database layer.
export enum IssueStatus {
  Submitted = 'submitted',
  Validating = 'validating',
  DuplicateCandidate = 'duplicate_candidate',
  Routing = 'routing',
  Routed = 'routed',
  InProgress = 'in_progress',
  Escalated = 'escalated',
  PubliclyEscalated = 'publicly_escalated',
  Resolved = 'resolved',
  Verifying = 'verifying',
  VerifiedResolved = 'verified_resolved',
  DisputedResolution = 'disputed_resolution',
  Inconclusive = 'inconclusive',
  Closed = 'closed',
}

// ─── User Role ───────────────────────────────────────────────────────────────
export enum UserRole {
  Citizen = 'citizen',
  Authority = 'authority',
  Admin = 'admin',
}

// ─── Photo Type ──────────────────────────────────────────────────────────────
export enum PhotoType {
  Before = 'before',
  After = 'after',
}

// ─── Agent Type ──────────────────────────────────────────────────────────────
export enum AgentType {
  Reporter = 'reporter',
  Validator = 'validator',
  Router = 'router',
  Escalation = 'escalation',
  Verifier = 'verifier',
  Predictor = 'predictor',
}

// ─── Actor Type (for status history) ────────────────────────────────────────
export enum ActorType {
  Citizen = 'citizen',
  Authority = 'authority',
  Admin = 'admin',
  AgentReporter = 'agent:reporter',
  AgentValidator = 'agent:validator',
  AgentRouter = 'agent:router',
  AgentEscalation = 'agent:escalation',
  AgentVerifier = 'agent:verifier',
  System = 'system',
}

// ─── Notification Channel ────────────────────────────────────────────────────
export enum NotificationChannel {
  Push = 'push',
  SMS = 'sms',
  Email = 'email',
  InApp = 'in_app',
}

// ─── Notification Delivery Status ───────────────────────────────────────────
export enum NotificationDeliveryStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

// ─── Hero Points Reason ──────────────────────────────────────────────────────
export enum HeroPointsReason {
  Routed = 'routed',
  VerifiedResolvedBonus = 'verified_resolved_bonus',
}

// ─── Verification Result ─────────────────────────────────────────────────────
export enum VerificationResult {
  VerifiedResolved = 'verified_resolved',
  Inconclusive = 'inconclusive',
  DisputedResolution = 'disputed_resolution',
}

// ─── SLA Risk Level (computed, not stored) ───────────────────────────────────
export enum SLARisk {
  Normal = 'normal',
  AtRisk = 'at_risk',     // Within 20% of deadline (BR-8.1)
  Breached = 'breached',
}

// ─── Validation constants ─────────────────────────────────────────────────────
/** BR-2.2: Auto-merge threshold */
export const DUPLICATE_AUTO_MERGE_THRESHOLD = 0.8;
/** BR-2.3: Lower bound for prompting user confirmation */
export const DUPLICATE_CONFIRM_THRESHOLD = 0.5;
/** BR-1.1: Minimum confidence to skip citizen manual confirmation */
export const CLASSIFICATION_AUTO_CONFIRM_THRESHOLD = 0.6;
/** BR-5.2: Verified resolved threshold */
export const VERIFICATION_RESOLVED_THRESHOLD = 0.75;
/** BR-5.2: Disputed resolution threshold (below this → disputed) */
export const VERIFICATION_DISPUTED_THRESHOLD = 0.4;
/** BR-8.1: SLA at-risk threshold (percentage of total SLA remaining) */
export const SLA_AT_RISK_PERCENTAGE = 0.2;
/** Default dispute window in days (BR-5.3) */
export const DISPUTE_WINDOW_DAYS = 7;
/** Corroboration count threshold for severity re-scoring (BR-2.4) */
export const CORROBORATION_SEVERITY_THRESHOLD = 5;
/** Max photo size in bytes (10MB per feature_specifications.md Feature 1) */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
/** Max description length */
export const MAX_DESCRIPTION_LENGTH = 500;

// ─── Valid state transitions ──────────────────────────────────────────────────
// Canonical state machine per user_flows.md. Enforced at API/orchestrator layer.
export const VALID_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.Submitted]: [IssueStatus.Validating],
  [IssueStatus.Validating]: [
    IssueStatus.DuplicateCandidate,
    IssueStatus.Routing,
  ],
  [IssueStatus.DuplicateCandidate]: [IssueStatus.Routing, IssueStatus.Submitted],
  [IssueStatus.Routing]: [IssueStatus.Routed],
  [IssueStatus.Routed]: [IssueStatus.InProgress, IssueStatus.Escalated],
  [IssueStatus.InProgress]: [IssueStatus.Resolved, IssueStatus.Escalated],
  [IssueStatus.Escalated]: [IssueStatus.Routed, IssueStatus.PubliclyEscalated],
  [IssueStatus.PubliclyEscalated]: [IssueStatus.InProgress],
  [IssueStatus.Resolved]: [IssueStatus.Verifying],
  [IssueStatus.Verifying]: [
    IssueStatus.VerifiedResolved,
    IssueStatus.DisputedResolution,
    IssueStatus.Inconclusive,
  ],
  [IssueStatus.VerifiedResolved]: [IssueStatus.DisputedResolution, IssueStatus.Closed],
  [IssueStatus.DisputedResolution]: [IssueStatus.Routed],
  [IssueStatus.Inconclusive]: [IssueStatus.VerifiedResolved, IssueStatus.DisputedResolution],
  [IssueStatus.Closed]: [],
};
