/**
 * CivicMind — Shared API client
 *
 * Typed fetch helpers for all endpoints defined in api_specification.md.
 * Used by all three frontend surfaces. Auth token is injected by each surface.
 */
const BASE = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:3001';
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
async function request(path, options = {}, token) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    if (!res.ok) {
        let body = {};
        try {
            body = (await res.json());
        }
        catch { /* ignore */ }
        throw new ApiError(res.status, body.error?.code ?? 'UNKNOWN_ERROR', body.error?.message ?? `HTTP ${res.status}`, body.error?.details);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
export const authApi = {
    guestSession: () => request('/api/v1/auth/guest-session', { method: 'POST', body: '{}' }),
    requestOtp: (contactType, contactValue) => request('/api/v1/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ contact_type: contactType, contact_value: contactValue }),
    }),
    verifyOtp: (otpRequestId, code) => request('/api/v1/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp_request_id: otpRequestId, code }),
    }),
    login: (email, password) => request('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
};
export const issuesApi = {
    submit: (token, payload) => request('/api/v1/issues', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token),
    confirm: (token, issueId, category, severity) => request(`/api/v1/issues/${issueId}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ confirmed_category: category, confirmed_severity: severity }),
    }, token),
    corroborate: (token, issueId, isSameIssue) => request(`/api/v1/issues/${issueId}/corroborate`, { method: 'POST', body: JSON.stringify({ is_same_issue: isSameIssue }) }, token),
    get: (token, issueId) => request(`/api/v1/issues/${issueId}`, {}, token),
    list: (token, params) => {
        const q = new URLSearchParams();
        if (params?.status)
            q.set('status', params.status);
        if (params?.category)
            q.set('category', params.category);
        if (params?.mine)
            q.set('mine', 'true');
        if (params?.limit)
            q.set('limit', String(params.limit));
        if (params?.cursor)
            q.set('cursor', params.cursor);
        const qs = q.toString();
        return request(`/api/v1/issues${qs ? `?${qs}` : ''}`, {}, token);
    },
    disputeResolution: (token, issueId, reason) => request(`/api/v1/issues/${issueId}/dispute-resolution`, { method: 'POST', body: JSON.stringify({ reason: reason ?? null }) }, token),
};
// ─── Public Map ───────────────────────────────────────────────────────────────
export const mapApi = {
    getIssues: (params) => {
        const q = new URLSearchParams(params);
        const qs = q.toString();
        return request(`/api/v1/map/issues${qs ? `?${qs}` : ''}`);
    },
    getHotspotForecasts: () => request('/api/v1/map/hotspot-forecasts'),
};
// ─── Authority ────────────────────────────────────────────────────────────────
export const authorityApi = {
    listIssues: (token, params) => {
        const q = new URLSearchParams();
        if (params?.status)
            q.set('status', params.status);
        if (params?.sla_risk)
            q.set('sla_risk', params.sla_risk);
        if (params?.limit)
            q.set('limit', String(params.limit));
        if (params?.cursor)
            q.set('cursor', params.cursor);
        const qs = q.toString();
        return request(`/api/v1/authority/issues${qs ? `?${qs}` : ''}`, {}, token);
    },
    updateStatus: (token, issueId, newStatus, afterPhotoRef) => request(`/api/v1/authority/issues/${issueId}/status`, {
        method: 'POST',
        body: JSON.stringify({ new_status: newStatus, after_photo_ref: afterPhotoRef ?? null }),
    }, token),
    reassign: (token, issueId, newDepartmentId, reason) => request(`/api/v1/authority/issues/${issueId}/reassign`, { method: 'POST', body: JSON.stringify({ new_department_id: newDepartmentId, reason }) }, token),
};
export const adminApi = {
    getSlaConfig: (token) => request('/api/v1/admin/sla-config', {}, token),
    updateSlaConfig: (token, payload) => request('/api/v1/admin/sla-config', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, token),
    getJurisdictionMapping: (token) => request('/api/v1/admin/jurisdiction-mapping', {}, token),
    updateJurisdictionMapping: (token, payload) => request('/api/v1/admin/jurisdiction-mapping', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, token),
    getAuditLog: (token, params) => {
        const q = new URLSearchParams();
        if (params?.agent_type)
            q.set('agent_type', params.agent_type);
        if (params?.issue_id)
            q.set('issue_id', params.issue_id);
        if (params?.date_from)
            q.set('date_from', params.date_from);
        if (params?.date_to)
            q.set('date_to', params.date_to);
        if (params?.limit)
            q.set('limit', String(params.limit));
        if (params?.cursor)
            q.set('cursor', params.cursor);
        const qs = q.toString();
        return request(`/api/v1/admin/agent-decision-log${qs ? `?${qs}` : ''}`, {}, token);
    },
    getUsers: (token) => request('/api/v1/admin/users', {}, token),
    createUser: (token, payload) => request('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, token),
};
//# sourceMappingURL=api-client.js.map