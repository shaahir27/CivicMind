/**
 * CivicMind — Entity Interfaces
 *
 * TypeScript interfaces for all database entities defined in database_design.md.
 * These are shared across backend (Firestore documents) and frontend (API responses).
 */

import type {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  UserRole,
  PhotoType,
  AgentType,
  ActorType,
  NotificationChannel,
  NotificationDeliveryStatus,
  HeroPointsReason,
} from './enums.js';

// ─── 2.1 User ────────────────────────────────────────────────────────────────
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
  created_at: string; // ISO8601 UTC
  updated_at: string;
}

// ─── 2.2 Department ──────────────────────────────────────────────────────────
export interface Department {
  department_id: string;
  name: string;
  category_scope: IssueCategory[];
  contact_channel?: string;
  escalation_tier_1_user_id?: string;
  created_at: string;
}

// ─── 2.3 JurisdictionMapping ─────────────────────────────────────────────────
export interface JurisdictionMapping {
  mapping_id: string;
  ward_or_area_id: string;
  category: IssueCategory;
  department_id: string;
  is_fallback: boolean;
}

// ─── 2.4 Issue ───────────────────────────────────────────────────────────────
export interface Issue {
  issue_id: string;
  idempotency_key?: string;
  reporter_user_id?: string | null;
  reporter_name?: string;
  category: IssueCategory;
  category_confidence: number; // 0.0–1.0
  severity: IssueSeverity;
  severity_confidence: number; // 0.0–1.0
  description?: string | null;
  location_lat: number;
  location_lng: number;
  location_address_text?: string;
  ward_or_area_id: string;
  status: IssueStatus;
  department_id?: string | null;
  sla_deadline?: string | null;   // ISO8601 UTC
  escalation_tier_current: number; // 0 = not escalated
  corroboration_count: number;    // default 1 (self)
  is_canonical: boolean;
  canonical_issue_id?: string | null;
  hotspot_forecast_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  verified_at?: string | null;
}

// ─── 2.5 IssuePhoto ──────────────────────────────────────────────────────────
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

// ─── 2.6 IssueStatusHistory ──────────────────────────────────────────────────
export interface IssueStatusHistory {
  history_id: string;
  issue_id: string;
  from_status?: IssueStatus | null;
  to_status: IssueStatus;
  actor_type: ActorType;
  actor_id?: string | null;
  reason?: string | null;
  created_at: string; // Immutable, append-only
}

// ─── 2.7 Corroboration ───────────────────────────────────────────────────────
export interface Corroboration {
  corroboration_id: string;
  canonical_issue_id: string;
  corroborating_user_id?: string | null;
  original_submitted_issue_id: string;
  match_confidence: number;
  created_at: string;
}

// ─── 2.8 AgentDecisionLog ────────────────────────────────────────────────────
export interface AgentDecisionLog {
  log_id: string;
  issue_id?: string | null;
  agent_type: AgentType;
  input_summary: string;  // JSON-serialized
  output_summary: string; // JSON-serialized
  confidence_score?: number | null;
  agent_version: string;
  created_at: string;
}

// ─── 2.9 SLAConfig ───────────────────────────────────────────────────────────
export interface SLAConfig {
  config_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  sla_hours: number;
  updated_by_admin_id: string;
  updated_at: string;
}

// ─── 2.10 EscalationTier ─────────────────────────────────────────────────────
export interface EscalationTier {
  tier_id: string;
  department_id: string;
  tier_level: number;   // ≥ 1
  responsible_user_id?: string | null;
  tier_label: string;   // e.g. "Department Head", "Ward Councilor"
}

// ─── 2.11 Notification ───────────────────────────────────────────────────────
export interface Notification {
  notification_id: string;
  recipient_user_id: string;
  issue_id?: string | null;
  channel: NotificationChannel;
  message_text: string;
  delivery_status: NotificationDeliveryStatus;
  created_at: string;
}

// ─── 2.12 HeroPointsLedger ───────────────────────────────────────────────────
export interface HeroPointsLedger {
  ledger_id: string;
  user_id: string;
  issue_id: string;
  points: number;
  reason: HeroPointsReason;
  created_at: string;
}

// ─── 2.13 HotspotForecast ────────────────────────────────────────────────────
export interface HotspotForecast {
  forecast_id: string;
  ward_or_area_id: string;
  predicted_category: IssueCategory;
  risk_score: number;   // 0.0–1.0
  confidence: number;   // 0.0–1.0
  is_public_visible: boolean;
  generated_at: string;
  valid_until: string;
}

// ─── 2.14 ImpactReport ───────────────────────────────────────────────────────
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
  civic_health_score: number; // 0–100
  generated_at: string;
}

// ─── Derived / API-layer types ────────────────────────────────────────────────

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
