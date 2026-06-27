/**
 * CivicMind — Shared API client
 *
 * Typed fetch helpers for all endpoints defined in api_specification.md.
 * Used by all three frontend surfaces. Auth token is injected by each surface.
 */
export declare class ApiError extends Error {
    status: number;
    code: string;
    details?: unknown | undefined;
    constructor(status: number, code: string, message: string, details?: unknown | undefined);
}
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
export declare const authApi: {
    guestSession: () => Promise<GuestSessionResponse>;
    requestOtp: (contactType: "phone" | "email", contactValue: string) => Promise<OtpRequestResponse>;
    verifyOtp: (otpRequestId: string, code: string) => Promise<LoginResponse>;
    login: (email: string, password: string) => Promise<LoginResponse>;
};
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
    duplicate_candidate: {
        issue_id: string;
        match_confidence: number;
    } | null;
}
export interface IssueSummary {
    issue_id: string;
    category: string;
    severity: string;
    status: string;
    location: {
        lat: number;
        lng: number;
        address_text?: string;
    };
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
export declare const issuesApi: {
    submit: (token: string, payload: {
        idempotency_key: string;
        photo_refs: string[];
        location: {
            lat: number;
            lng: number;
        };
        description?: string | null;
        manual_category_override?: string | null;
    }) => Promise<SubmitIssueResponse>;
    confirm: (token: string, issueId: string, category: string, severity: string) => Promise<ConfirmIssueResponse>;
    corroborate: (token: string, issueId: string, isSameIssue: boolean) => Promise<{
        result: string;
        canonical_issue_id: string;
    }>;
    get: (token: string, issueId: string) => Promise<IssueDetail>;
    list: (token: string, params?: {
        status?: string;
        category?: string;
        mine?: boolean;
        limit?: number;
        cursor?: string;
    }) => Promise<{
        issues: IssueSummary[];
        next_cursor: string | null;
    }>;
    disputeResolution: (token: string, issueId: string, reason?: string) => Promise<{
        issue_id: string;
        status: string;
    }>;
};
export declare const mapApi: {
    getIssues: (params?: {
        bounding_box?: string;
        category?: string;
        status?: string;
    }) => Promise<{
        issues: IssueSummary[];
    }>;
    getHotspotForecasts: () => Promise<{
        forecasts: unknown[];
    }>;
};
export declare const authorityApi: {
    listIssues: (token: string, params?: {
        status?: string;
        sla_risk?: string;
        limit?: number;
        cursor?: string;
    }) => Promise<{
        issues: IssueSummary[];
        next_cursor: string | null;
    }>;
    updateStatus: (token: string, issueId: string, newStatus: "in_progress" | "resolved", afterPhotoRef?: string) => Promise<{
        issue_id: string;
        status: string;
    }>;
    reassign: (token: string, issueId: string, newDepartmentId: string, reason: string) => Promise<{
        issue_id: string;
        department_id: string;
        status: string;
    }>;
};
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
export declare const adminApi: {
    getSlaConfig: (token: string) => Promise<{
        configs: SLAConfigEntry[];
    }>;
    updateSlaConfig: (token: string, payload: {
        category: string;
        severity: string;
        sla_hours: number;
    }) => Promise<SLAConfigEntry>;
    getJurisdictionMapping: (token: string) => Promise<{
        mappings: JurisdictionMappingEntry[];
    }>;
    updateJurisdictionMapping: (token: string, payload: {
        ward_or_area_id: string;
        category: string;
        department_id: string;
    }) => Promise<JurisdictionMappingEntry>;
    getAuditLog: (token: string, params?: {
        agent_type?: string;
        issue_id?: string;
        date_from?: string;
        date_to?: string;
        limit?: number;
        cursor?: string;
    }) => Promise<{
        logs: AuditLogEntry[];
        next_cursor: string | null;
    }>;
    getUsers: (token: string) => Promise<{
        users: unknown[];
    }>;
    createUser: (token: string, payload: {
        email: string;
        role: "authority" | "admin";
        department_id: string | null;
        jurisdiction_scope: string[];
    }) => Promise<{
        user_id: string;
        invite_sent: boolean;
    }>;
};
//# sourceMappingURL=api-client.d.ts.map