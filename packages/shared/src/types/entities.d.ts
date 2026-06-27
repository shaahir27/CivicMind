/**
 * CivicMind — Entity Interfaces
 *
 * TypeScript interfaces for all database entities defined in database_design.md.
 * These are shared across backend (Firestore documents) and frontend (API responses).
 */
import type { IssueCategory, IssueSeverity, IssueStatus, UserRole, PhotoType, AgentType, ActorType, NotificationChannel, NotificationDeliveryStatus, HeroPointsReason } from './enums.js';
export interface User {
    user_id: string;
    role: UserRole;
    display_name?: string;
    phone?: string | null;
    email?: string | null;
    auth_provider_id: string;
    department_id?: string | null;
    jurisdiction_scope?: string[] | null;
    hero_points_balance: number;
    is_guest: boolean;
    preferred_language: string;
    created_at: string;
    updated_at: string;
}
export interface Department {
    department_id: string;
    name: string;
    category_scope: IssueCategory[];
    contact_channel?: string;
    escalation_tier_1_user_id?: string;
    created_at: string;
}
export interface JurisdictionMapping {
    mapping_id: string;
    ward_or_area_id: string;
    category: IssueCategory;
    department_id: string;
    is_fallback: boolean;
}
export interface Issue {
    issue_id: string;
    idempotency_key?: string;
    reporter_user_id?: string | null;
    category: IssueCategory;
    category_confidence: number;
    severity: IssueSeverity;
    severity_confidence: number;
    description?: string | null;
    location_lat: number;
    location_lng: number;
    location_address_text?: string;
    ward_or_area_id: string;
    status: IssueStatus;
    department_id?: string | null;
    sla_deadline?: string | null;
    escalation_tier_current: number;
    corroboration_count: number;
    is_canonical: boolean;
    canonical_issue_id?: string | null;
    hotspot_forecast_id?: string | null;
    created_at: string;
    updated_at: string;
    resolved_at?: string | null;
    verified_at?: string | null;
}
export interface IssuePhoto {
    photo_id: string;
    issue_id: string;
    photo_type: PhotoType;
    storage_path: string;
    uploaded_by_user_id: string;
    geotag_lat?: number;
    geotag_lng?: number;
    created_at: string;
}
export interface IssueStatusHistory {
    history_id: string;
    issue_id: string;
    from_status?: IssueStatus | null;
    to_status: IssueStatus;
    actor_type: ActorType;
    actor_id?: string | null;
    reason?: string | null;
    created_at: string;
}
export interface Corroboration {
    corroboration_id: string;
    canonical_issue_id: string;
    corroborating_user_id?: string | null;
    original_submitted_issue_id: string;
    match_confidence: number;
    created_at: string;
}
export interface AgentDecisionLog {
    log_id: string;
    issue_id?: string | null;
    agent_type: AgentType;
    input_summary: string;
    output_summary: string;
    confidence_score?: number | null;
    agent_version: string;
    created_at: string;
}
export interface SLAConfig {
    config_id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    sla_hours: number;
    updated_by_admin_id: string;
    updated_at: string;
}
export interface EscalationTier {
    tier_id: string;
    department_id: string;
    tier_level: number;
    responsible_user_id?: string | null;
    tier_label: string;
}
export interface Notification {
    notification_id: string;
    recipient_user_id: string;
    issue_id?: string | null;
    channel: NotificationChannel;
    message_text: string;
    delivery_status: NotificationDeliveryStatus;
    created_at: string;
}
export interface HeroPointsLedger {
    ledger_id: string;
    user_id: string;
    issue_id: string;
    points: number;
    reason: HeroPointsReason;
    created_at: string;
}
export interface HotspotForecast {
    forecast_id: string;
    ward_or_area_id: string;
    predicted_category: IssueCategory;
    risk_score: number;
    confidence: number;
    is_public_visible: boolean;
    generated_at: string;
    valid_until: string;
}
export interface ImpactReport {
    report_id: string;
    ward_or_area_id: string;
    period_start: string;
    period_end: string;
    total_issues: number;
    resolution_rate: number;
    avg_resolution_hours: number;
    avg_verification_hours: number;
    escalation_rate: number;
    estimated_savings_value: number;
    civic_health_score: number;
    generated_at: string;
}
/** Summary object returned in list endpoints */
export interface IssueSummary {
    issue_id: string;
    category: IssueCategory;
    severity: IssueSeverity;
    status: IssueStatus;
    location: {
        lat: number;
        lng: number;
        address_text?: string;
    };
    corroboration_count: number;
    department_name?: string | null;
    sla_deadline?: string | null;
    time_remaining_seconds?: number | null;
    created_at: string;
    updated_at: string;
}
/** Full issue detail with nested history and photos */
export interface IssueDetail extends Issue {
    photos: IssuePhoto[];
    status_history: IssueStatusHistory[];
    department_name?: string | null;
}
/** Geolocation coordinate pair */
export interface GeoLocation {
    lat: number;
    lng: number;
}
/** Service area bounding box */
export interface BoundingBox {
    lat_min: number;
    lat_max: number;
    lng_min: number;
    lng_max: number;
}
//# sourceMappingURL=entities.d.ts.map