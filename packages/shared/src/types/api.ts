/**
 * CivicMind — API Request/Response shapes
 *
 * Typed payloads for all endpoints defined in api_specification.md.
 * Field names must match exactly what the spec defines.
 */

import type { IssueCategory, IssueSeverity, IssueStatus, UserRole } from './enums.js';
import type { IssueDetail, IssueSummary, SLAConfig, JurisdictionMapping, AgentDecisionLog, ImpactReport, HotspotForecast } from './entities.js';

// ─── Error envelope (api_specification.md §1) ────────────────────────────────
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_SCOPE'
  | 'NOT_FOUND'
  | 'INVALID_STATE_TRANSITION'
  | 'DUPLICATE_IDEMPOTENCY_KEY'
  | 'MISSING_REQUIRED_EVIDENCE'
  | 'OUTSIDE_SERVICE_AREA'
  | 'INSUFFICIENT_DATA'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ─── §2 Auth ─────────────────────────────────────────────────────────────────

export interface GuestSessionResponse {
  session_token: string;
  user_id: string;
  is_guest: true;
}

export interface OtpRequestPayload {
  contact_type: 'phone' | 'email';
  contact_value: string;
}

export interface OtpRequestResponse {
  otp_request_id: string;
  expires_in_seconds: number;
}

export interface OtpVerifyPayload {
  otp_request_id: string;
  code: string;
}

export interface AuthTokenResponse {
  access_token: string;
  user_id: string;
  role: UserRole;
  department_id?: string | null;
  jurisdiction_scope?: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── §3 Citizen Issue Endpoints ──────────────────────────────────────────────

export interface SubmitIssuePayload {
  idempotency_key: string;
  photo_refs: string[];
  location: { lat: number; lng: number };
  description?: string | null;
  manual_category_override?: IssueCategory | null;
}

export interface SubmitIssueResponse {
  issue_id: string;
  status: IssueStatus;
  suggested_category: IssueCategory;
  category_confidence: number;
  suggested_severity: IssueSeverity;
  severity_confidence: number;
  requires_citizen_confirmation: boolean;
}

export interface ConfirmIssuePayload {
  confirmed_category: IssueCategory;
  confirmed_severity: IssueSeverity;
}

export interface ConfirmIssueResponse {
  issue_id: string;
  status: IssueStatus;
  duplicate_candidate: {
    issue_id: string;
    match_confidence: number;
  } | null;
}

export interface CorroboratePayload {
  is_same_issue: boolean;
}

export interface CorroborateResponse {
  result: 'merged_as_corroboration' | 'created_as_new';
  canonical_issue_id: string;
}

export interface DisputeResolutionPayload {
  reason?: string | null;
}

export interface DisputeResolutionResponse {
  issue_id: string;
  status: IssueStatus;
}

export interface ListIssuesQuery {
  status?: IssueStatus;
  category?: IssueCategory;
  severity?: IssueSeverity;
  ward_or_area_id?: string;
  bounding_box?: string; // "lat_min,lng_min,lat_max,lng_max"
  mine?: boolean;
  limit?: number;
  cursor?: string;
}

export interface PaginatedIssuesResponse {
  issues: IssueSummary[];
  next_cursor: string | null;
}

// ─── §4 Authority Issue Endpoints ────────────────────────────────────────────

export interface AuthorityIssuesQuery {
  status?: IssueStatus;
  sla_risk?: 'at_risk' | 'breached' | 'normal';
  limit?: number;
  cursor?: string;
}

export interface UpdateIssueStatusPayload {
  new_status: 'in_progress' | 'resolved';
  after_photo_ref?: string;
}

export interface UpdateIssueStatusResponse {
  issue_id: string;
  status: IssueStatus;
}

export interface ReassignIssuePayload {
  new_department_id: string;
  reason: string;
}

export interface ReassignIssueResponse {
  issue_id: string;
  department_id: string;
  status: IssueStatus;
}

// ─── §5 Admin Endpoints ──────────────────────────────────────────────────────

export interface UpdateSLAConfigPayload {
  category: IssueCategory;
  severity: IssueSeverity;
  sla_hours: number;
}

export interface UpdateJurisdictionMappingPayload {
  ward_or_area_id: string;
  category: IssueCategory;
  department_id: string;
}

export interface AgentDecisionLogQuery {
  agent_type?: string;
  issue_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  cursor?: string;
}

export interface PaginatedAgentLogsResponse {
  logs: AgentDecisionLog[];
  next_cursor: string | null;
}

export interface CreateUserPayload {
  email: string;
  role: 'authority' | 'admin';
  department_id?: string | null;
  jurisdiction_scope?: string[];
}

export interface CreateUserResponse {
  user_id: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  jurisdiction_scope?: string[];
  invite_sent: boolean;
}

// ─── §6 Map / Forecast / Reporting ───────────────────────────────────────────

export interface MapIssuesQuery {
  bounding_box?: string;
  category?: IssueCategory;
  status?: IssueStatus;
}

export interface PublicIssueMapItem {
  issue_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  location: { lat: number; lng: number };
}

export interface PublicMapIssuesResponse {
  issues: PublicIssueMapItem[];
}

export interface HotspotForecastsResponse {
  forecasts: HotspotForecast[];
}

export interface ImpactReportsQuery {
  ward_or_area_id?: string;
  period_start?: string;
  period_end?: string;
}

export interface ImpactReportsResponse {
  reports: ImpactReport[];
}

export interface GenerateImpactReportPayload {
  ward_or_area_id: string;
  period_start: string;
  period_end: string;
}

export interface GenerateImpactReportResponse {
  report_id: string;
  status: 'generated';
}

// ─── §7 Internal Agent Endpoints ─────────────────────────────────────────────

export interface EscalationRunResponse {
  evaluated_count: number;
  escalated_count: number;
  publicly_escalated_count: number;
}

export interface PredictorRunResponse {
  forecasts_generated: number;
  areas_with_insufficient_data: number;
}

// ─── Re-export IssueDetail for convenience in frontend ───────────────────────
export type { IssueDetail, IssueSummary, SLAConfig, JurisdictionMapping };
