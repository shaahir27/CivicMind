/**
 * CivicMind — Canonical Enums
 *
 * These enums are the single source of truth for all status values,
 * categories, and role definitions used across the entire platform.
 * They map directly to database_design.md and user_flows.md.
 */
// ─── Issue Category ──────────────────────────────────────────────────────────
// Per database_design.md §2.4 and feature_specifications.md Feature 1
export var IssueCategory;
(function (IssueCategory) {
    IssueCategory["Pothole"] = "pothole";
    IssueCategory["Streetlight"] = "streetlight";
    IssueCategory["Garbage"] = "garbage";
    IssueCategory["WaterLeakage"] = "water_leakage";
    IssueCategory["TrafficSignal"] = "traffic_signal";
    IssueCategory["Drainage"] = "drainage";
    IssueCategory["RoadDamage"] = "road_damage";
    IssueCategory["Other"] = "other";
})(IssueCategory || (IssueCategory = {}));
// ─── Issue Severity ──────────────────────────────────────────────────────────
export var IssueSeverity;
(function (IssueSeverity) {
    IssueSeverity["Low"] = "low";
    IssueSeverity["Medium"] = "medium";
    IssueSeverity["High"] = "high";
    IssueSeverity["Critical"] = "critical";
})(IssueSeverity || (IssueSeverity = {}));
// ─── Issue Status — Canonical State Machine ──────────────────────────────────
// Per user_flows.md canonical state machine.
// Transitions enforced at orchestrator/API layer, NOT database layer.
export var IssueStatus;
(function (IssueStatus) {
    IssueStatus["Submitted"] = "submitted";
    IssueStatus["Validating"] = "validating";
    IssueStatus["DuplicateCandidate"] = "duplicate_candidate";
    IssueStatus["Routing"] = "routing";
    IssueStatus["Routed"] = "routed";
    IssueStatus["InProgress"] = "in_progress";
    IssueStatus["Escalated"] = "escalated";
    IssueStatus["PubliclyEscalated"] = "publicly_escalated";
    IssueStatus["Resolved"] = "resolved";
    IssueStatus["Verifying"] = "verifying";
    IssueStatus["VerifiedResolved"] = "verified_resolved";
    IssueStatus["DisputedResolution"] = "disputed_resolution";
    IssueStatus["Inconclusive"] = "inconclusive";
    IssueStatus["Closed"] = "closed";
})(IssueStatus || (IssueStatus = {}));
// ─── User Role ───────────────────────────────────────────────────────────────
export var UserRole;
(function (UserRole) {
    UserRole["Citizen"] = "citizen";
    UserRole["Authority"] = "authority";
    UserRole["Admin"] = "admin";
})(UserRole || (UserRole = {}));
// ─── Photo Type ──────────────────────────────────────────────────────────────
export var PhotoType;
(function (PhotoType) {
    PhotoType["Before"] = "before";
    PhotoType["After"] = "after";
})(PhotoType || (PhotoType = {}));
// ─── Agent Type ──────────────────────────────────────────────────────────────
export var AgentType;
(function (AgentType) {
    AgentType["Reporter"] = "reporter";
    AgentType["Validator"] = "validator";
    AgentType["Router"] = "router";
    AgentType["Escalation"] = "escalation";
    AgentType["Verifier"] = "verifier";
    AgentType["Predictor"] = "predictor";
})(AgentType || (AgentType = {}));
// ─── Actor Type (for status history) ────────────────────────────────────────
export var ActorType;
(function (ActorType) {
    ActorType["Citizen"] = "citizen";
    ActorType["Authority"] = "authority";
    ActorType["Admin"] = "admin";
    ActorType["AgentReporter"] = "agent:reporter";
    ActorType["AgentValidator"] = "agent:validator";
    ActorType["AgentRouter"] = "agent:router";
    ActorType["AgentEscalation"] = "agent:escalation";
    ActorType["AgentVerifier"] = "agent:verifier";
    ActorType["System"] = "system";
})(ActorType || (ActorType = {}));
// ─── Notification Channel ────────────────────────────────────────────────────
export var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["Push"] = "push";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["Email"] = "email";
    NotificationChannel["InApp"] = "in_app";
})(NotificationChannel || (NotificationChannel = {}));
// ─── Notification Delivery Status ───────────────────────────────────────────
export var NotificationDeliveryStatus;
(function (NotificationDeliveryStatus) {
    NotificationDeliveryStatus["Pending"] = "pending";
    NotificationDeliveryStatus["Sent"] = "sent";
    NotificationDeliveryStatus["Failed"] = "failed";
})(NotificationDeliveryStatus || (NotificationDeliveryStatus = {}));
// ─── Hero Points Reason ──────────────────────────────────────────────────────
export var HeroPointsReason;
(function (HeroPointsReason) {
    HeroPointsReason["Routed"] = "routed";
    HeroPointsReason["VerifiedResolvedBonus"] = "verified_resolved_bonus";
})(HeroPointsReason || (HeroPointsReason = {}));
// ─── Verification Result ─────────────────────────────────────────────────────
export var VerificationResult;
(function (VerificationResult) {
    VerificationResult["VerifiedResolved"] = "verified_resolved";
    VerificationResult["Inconclusive"] = "inconclusive";
    VerificationResult["DisputedResolution"] = "disputed_resolution";
})(VerificationResult || (VerificationResult = {}));
// ─── SLA Risk Level (computed, not stored) ───────────────────────────────────
export var SLARisk;
(function (SLARisk) {
    SLARisk["Normal"] = "normal";
    SLARisk["AtRisk"] = "at_risk";
    SLARisk["Breached"] = "breached";
})(SLARisk || (SLARisk = {}));
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
export const VALID_STATUS_TRANSITIONS = {
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
//# sourceMappingURL=enums.js.map