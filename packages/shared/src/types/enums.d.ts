/**
 * CivicMind — Canonical Enums
 *
 * These enums are the single source of truth for all status values,
 * categories, and role definitions used across the entire platform.
 * They map directly to database_design.md and user_flows.md.
 */
export declare enum IssueCategory {
    Pothole = "pothole",
    Streetlight = "streetlight",
    Garbage = "garbage",
    WaterLeakage = "water_leakage",
    TrafficSignal = "traffic_signal",
    Drainage = "drainage",
    RoadDamage = "road_damage",
    Other = "other"
}
export declare enum IssueSeverity {
    Low = "low",
    Medium = "medium",
    High = "high",
    Critical = "critical"
}
export declare enum IssueStatus {
    Submitted = "submitted",
    Validating = "validating",
    DuplicateCandidate = "duplicate_candidate",
    Routing = "routing",
    Routed = "routed",
    InProgress = "in_progress",
    Escalated = "escalated",
    PubliclyEscalated = "publicly_escalated",
    Resolved = "resolved",
    Verifying = "verifying",
    VerifiedResolved = "verified_resolved",
    DisputedResolution = "disputed_resolution",
    Inconclusive = "inconclusive",
    Closed = "closed"
}
export declare enum UserRole {
    Citizen = "citizen",
    Authority = "authority",
    Admin = "admin"
}
export declare enum PhotoType {
    Before = "before",
    After = "after"
}
export declare enum AgentType {
    Reporter = "reporter",
    Validator = "validator",
    Router = "router",
    Escalation = "escalation",
    Verifier = "verifier",
    Predictor = "predictor"
}
export declare enum ActorType {
    Citizen = "citizen",
    Authority = "authority",
    Admin = "admin",
    AgentReporter = "agent:reporter",
    AgentValidator = "agent:validator",
    AgentRouter = "agent:router",
    AgentEscalation = "agent:escalation",
    AgentVerifier = "agent:verifier",
    System = "system"
}
export declare enum NotificationChannel {
    Push = "push",
    SMS = "sms",
    Email = "email",
    InApp = "in_app"
}
export declare enum NotificationDeliveryStatus {
    Pending = "pending",
    Sent = "sent",
    Failed = "failed"
}
export declare enum HeroPointsReason {
    Routed = "routed",
    VerifiedResolvedBonus = "verified_resolved_bonus"
}
export declare enum VerificationResult {
    VerifiedResolved = "verified_resolved",
    Inconclusive = "inconclusive",
    DisputedResolution = "disputed_resolution"
}
export declare enum SLARisk {
    Normal = "normal",
    AtRisk = "at_risk",// Within 20% of deadline (BR-8.1)
    Breached = "breached"
}
/** BR-2.2: Auto-merge threshold */
export declare const DUPLICATE_AUTO_MERGE_THRESHOLD = 0.8;
/** BR-2.3: Lower bound for prompting user confirmation */
export declare const DUPLICATE_CONFIRM_THRESHOLD = 0.5;
/** BR-1.1: Minimum confidence to skip citizen manual confirmation */
export declare const CLASSIFICATION_AUTO_CONFIRM_THRESHOLD = 0.6;
/** BR-5.2: Verified resolved threshold */
export declare const VERIFICATION_RESOLVED_THRESHOLD = 0.75;
/** BR-5.2: Disputed resolution threshold (below this → disputed) */
export declare const VERIFICATION_DISPUTED_THRESHOLD = 0.4;
/** BR-8.1: SLA at-risk threshold (percentage of total SLA remaining) */
export declare const SLA_AT_RISK_PERCENTAGE = 0.2;
/** Default dispute window in days (BR-5.3) */
export declare const DISPUTE_WINDOW_DAYS = 7;
/** Corroboration count threshold for severity re-scoring (BR-2.4) */
export declare const CORROBORATION_SEVERITY_THRESHOLD = 5;
/** Max photo size in bytes (10MB per feature_specifications.md Feature 1) */
export declare const MAX_PHOTO_SIZE_BYTES: number;
/** Max description length */
export declare const MAX_DESCRIPTION_LENGTH = 500;
export declare const VALID_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]>;
//# sourceMappingURL=enums.d.ts.map