/**
 * CivicMind — Shared API client
 *
 * Typed fetch helpers for all endpoints defined in api_specification.md.
 * Used by all three frontend surfaces. Auth token is injected by each surface.
 */

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try { body = (await res.json()) as any; } catch { /* ignore */ }
    throw new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? `HTTP ${res.status}`,
      body.error?.details
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface GuestSessionResponse {
  session_token: string;
  user_id: string;
  is_guest: boolean;
}

export interface LoginResponse {
  access_token: string;
  user_id: string;
  role: 'citizen' | 'authority' | 'admin';
  department_id: string | null;
  jurisdiction_scope: string[];
}

export interface OtpRequestResponse {
  otp_request_id: string;
  expires_in_seconds: number;
}

export const authApi = {
  guestSession: () =>
    request<GuestSessionResponse>('/api/v1/auth/guest-session', { method: 'POST', body: '{}' }),

  requestOtp: (contactType: 'phone' | 'email', contactValue: string) =>
    request<OtpRequestResponse>('/api/v1/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ contact_type: contactType, contact_value: contactValue }),
    }),

  verifyOtp: (otpRequestId: string, code: string) =>
    request<LoginResponse>('/api/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ otp_request_id: otpRequestId, code }),
    }),

  login: (email: string, password: string) =>
    request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Issues (Citizen) ─────────────────────────────────────────────────────────

export interface SubmitIssueResponse {
  issue_id: string;
  status: string;
  suggested_category: string;
  category_confidence: number;
  suggested_severity: string;
  severity_confidence: number;
  requires_citizen_confirmation: boolean;
}

export interface ConfirmIssueResponse {
  issue_id: string;
  status: string;
  duplicate_candidate: { issue_id: string; match_confidence: number } | null;
}

export interface IssueSummary {
  issue_id: string;
  category: string;
  severity: string;
  reporter_name?: string;
  status: string;
  location: { lat: number; lng: number; address_text?: string };
  corroboration_count: number;
  department_name: string | null;
  sla_deadline: string | null;
  time_remaining_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface IssuePhoto {
  photo_id: string;
  photo_type: 'before' | 'after';
  url: string;
}

export interface StatusHistoryEntry {
  to_status: string;
  created_at: string;
  reason: string | null;
}

export interface IssueDetail extends IssueSummary {
  description: string | null;
  photos: IssuePhoto[];
  status_history: StatusHistoryEntry[];
  ward_or_area_id?: string;
}

export const issuesApi = {
  submit: (
    token: string,
    payload: {
      idempotency_key: string;
      photo_refs: string[];
      location: { lat: number; lng: number };
      description?: string | null;
      manual_category_override?: string | null;
    }
  ) =>
    request<SubmitIssueResponse>('/api/v1/issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  confirm: (token: string, issueId: string, category: string, severity: string) =>
    request<ConfirmIssueResponse>(`/api/v1/issues/${issueId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed_category: category, confirmed_severity: severity }),
    }, token),

  corroborate: (token: string, issueId: string, isSameIssue: boolean) =>
    request<{ result: string; canonical_issue_id: string }>(
      `/api/v1/issues/${issueId}/corroborate`,
      { method: 'POST', body: JSON.stringify({ is_same_issue: isSameIssue }) },
      token
    ),

  get: (token: string, issueId: string) =>
    request<IssueDetail>(`/api/v1/issues/${issueId}`, {}, token),

  list: (
    token: string,
    params?: {
      status?: string;
      category?: string;
      mine?: boolean;
      limit?: number;
      cursor?: string;
    }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.category) q.set('category', params.category);
    if (params?.mine) q.set('mine', 'true');
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return request<{ issues: IssueSummary[]; next_cursor: string | null }>(
      `/api/v1/issues${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  disputeResolution: (token: string, issueId: string, reason?: string) =>
    request<{ issue_id: string; status: string }>(
      `/api/v1/issues/${issueId}/dispute-resolution`,
      { method: 'POST', body: JSON.stringify({ reason: reason ?? null }) },
      token
    ),
};

// ─── Public Map ───────────────────────────────────────────────────────────────

export const mapApi = {
  getIssues: (params?: { bounding_box?: string; category?: string; status?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>);
    const qs = q.toString();
    return request<{ issues: IssueSummary[] }>(`/api/v1/map/issues${qs ? `?${qs}` : ''}`);
  },
  getHotspotForecasts: () =>
    request<{ forecasts: unknown[] }>('/api/v1/map/hotspot-forecasts'),
};

// ─── Authority ────────────────────────────────────────────────────────────────

export const authorityApi = {
  listIssues: (
    token: string,
    params?: { status?: string; sla_risk?: string; limit?: number; cursor?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.sla_risk) q.set('sla_risk', params.sla_risk);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return request<{ issues: IssueSummary[]; next_cursor: string | null }>(
      `/api/v1/authority/issues${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  updateStatus: (
    token: string,
    issueId: string,
    newStatus: 'in_progress' | 'resolved',
    afterPhotoRef?: string
  ) =>
    request<{ issue_id: string; status: string }>(
      `/api/v1/authority/issues/${issueId}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ new_status: newStatus, after_photo_ref: afterPhotoRef ?? null }),
      },
      token
    ),

  reassign: (token: string, issueId: string, newDepartmentId: string, reason: string) =>
    request<{ issue_id: string; department_id: string; status: string }>(
      `/api/v1/authority/issues/${issueId}/reassign`,
      { method: 'POST', body: JSON.stringify({ new_department_id: newDepartmentId, reason }) },
      token
    ),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface SLAConfigEntry {
  config_id: string;
  category: string;
  severity: string;
  sla_hours: number;
  updated_at: string;
}

export interface JurisdictionMappingEntry {
  mapping_id: string;
  ward_or_area_id: string;
  category: string;
  department_id: string;
  is_fallback: boolean;
}

export interface AuditLogEntry {
  log_id: string;
  agent_type: string;
  issue_id: string | null;
  input_summary: string;
  output_summary: string;
  confidence_score: number | null;
  created_at: string;
}

export const adminApi = {
  getSlaConfig: (token: string) =>
    request<{ configs: SLAConfigEntry[] }>('/api/v1/admin/sla-config', {}, token),

  updateSlaConfig: (
    token: string,
    payload: { category: string; severity: string; sla_hours: number }
  ) =>
    request<SLAConfigEntry>('/api/v1/admin/sla-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token),

  getJurisdictionMapping: (token: string) =>
    request<{ mappings: JurisdictionMappingEntry[] }>('/api/v1/admin/jurisdiction-mapping', {}, token),

  updateJurisdictionMapping: (
    token: string,
    payload: { ward_or_area_id: string; category: string; department_id: string }
  ) =>
    request<JurisdictionMappingEntry>('/api/v1/admin/jurisdiction-mapping', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token),

  getAuditLog: (
    token: string,
    params?: { agent_type?: string; issue_id?: string; date_from?: string; date_to?: string; limit?: number; cursor?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.agent_type) q.set('agent_type', params.agent_type);
    if (params?.issue_id) q.set('issue_id', params.issue_id);
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.cursor) q.set('cursor', params.cursor);
    const qs = q.toString();
    return request<{ logs: AuditLogEntry[]; next_cursor: string | null }>(
      `/api/v1/admin/agent-decision-log${qs ? `?${qs}` : ''}`,
      {},
      token
    );
  },

  getUsers: (token: string) =>
    request<{ users: unknown[] }>('/api/v1/admin/users', {}, token),

  createUser: (
    token: string,
    payload: { email: string; role: 'authority' | 'admin'; department_id: string | null; jurisdiction_scope: string[] }
  ) =>
    request<{ user_id: string; invite_sent: boolean }>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),
};
