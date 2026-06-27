# CivicMind — API Specification

> Describes required endpoints, payload shapes, auth, and error conventions at a specification level. No implementation code. All field names align with entities defined in `database_design.md`. All status values align with the canonical state machine in `user_flows.md`.

---

## 1. API Design Guidelines

- **Style:** RESTful resource-oriented endpoints, JSON request/response bodies.
- **Base path convention:** `/api/v1/...` — version prefix from day one to allow non-breaking evolution post-hackathon.
- **Authentication:** Bearer token (issued by the identity provider referenced in `system_architecture.md` Section 5) on every request except public read-only map/forecast endpoints explicitly marked otherwise below.
- **Authorization:** Role-based (`citizen`, `authority`, `admin`) plus jurisdiction/department scoping for `authority` role, enforced server-side on every request — never trust a client-supplied department/jurisdiction claim.
- **Idempotency:** All state-mutating POST endpoints that originate from potentially-retried client actions (e.g., report submission) must accept an `idempotency_key` field to prevent duplicate record creation on retry (directly supports Error Scenario 5.1 in `user_flows.md`).
- **Pagination:** All list endpoints support `limit` (default 50, max 200) and `cursor`-based pagination (not offset-based, for consistency with a document-store backend).
- **Error format:** All error responses share a consistent envelope:
```
{
  "error": {
    "code": "string (machine-readable, e.g., INVALID_STATE_TRANSITION)",
    "message": "string (human-readable)",
    "details": { ... optional structured context ... }
  }
}
```
- **Status codes:** Standard HTTP semantics — 200 (success), 201 (created), 400 (validation error), 401 (unauthenticated), 403 (unauthorized/forbidden — including out-of-jurisdiction access), 404 (not found), 409 (conflict, e.g., illegal state transition or duplicate idempotency key with different payload), 422 (unprocessable — e.g., missing required after-photo), 429 (rate limited), 500 (server error).

---

## 2. Authentication Endpoints

### POST `/api/v1/auth/guest-session`
- **Purpose:** Create an anonymous guest session for citizen reporting without account creation.
- **Auth required:** No.
- **Request payload:** `{}` (device fingerprint optional, for abuse mitigation)
- **Response payload:** `{ "session_token": "string", "user_id": "string", "is_guest": true }`
- **Errors:** 429 if rate-limited.

### POST `/api/v1/auth/request-otp`
- **Purpose:** Begin citizen account creation/login via phone or email.
- **Auth required:** No.
- **Request payload:** `{ "contact_type": "phone|email", "contact_value": "string" }`
- **Response payload:** `{ "otp_request_id": "string", "expires_in_seconds": 300 }`
- **Errors:** 400 invalid contact format, 429 too many requests.

### POST `/api/v1/auth/verify-otp`
- **Purpose:** Complete login/account creation.
- **Auth required:** No.
- **Request payload:** `{ "otp_request_id": "string", "code": "string" }`
- **Response payload:** `{ "access_token": "string", "user_id": "string", "role": "citizen" }`
- **Errors:** 400 invalid/expired code, 404 unknown otp_request_id.

### POST `/api/v1/auth/login` (Authority/Admin)
- **Purpose:** Credentialed login for authority/admin roles.
- **Auth required:** No.
- **Request payload:** `{ "email": "string", "password": "string" }`
- **Response payload:** `{ "access_token": "string", "user_id": "string", "role": "authority|admin", "department_id": "string|null", "jurisdiction_scope": ["string"] }`
- **Errors:** 401 invalid credentials.

---

## 3. Issue Endpoints (Citizen-Facing)

### POST `/api/v1/issues`
- **Purpose:** Submit a new issue report. Triggers Reporter Agent (synchronous, returns suggested classification before final commit) per the two-step flow described in `user_flows.md` Section 2.
- **Auth required:** Yes (citizen or guest session).
- **Request payload:**
```
{
  "idempotency_key": "string",
  "photo_refs": ["string (pre-uploaded storage reference)"],
  "location": { "lat": number, "lng": number },
  "description": "string|null",
  "manual_category_override": "string|null"
}
```
- **Response payload (201):**
```
{
  "issue_id": "string",
  "status": "submitted|validating",
  "suggested_category": "string",
  "category_confidence": number,
  "suggested_severity": "string",
  "severity_confidence": number,
  "requires_citizen_confirmation": boolean
}
```
- **Errors:** 400 missing photo or location, 400 `INVALID_CIVIC_ISSUE` if AI rejects image as non-civic, 422 location outside supported service area, 409 idempotency key reused with different payload.

### POST `/api/v1/issues/{issue_id}/confirm`
- **Purpose:** Citizen confirms or overrides AI-suggested category/severity, finalizing submission and triggering the Validator Agent.
- **Auth required:** Yes, must be the reporting user (or guest session owner).
- **Request payload:** `{ "confirmed_category": "string", "confirmed_severity": "string" }`
- **Response payload:** `{ "issue_id": "string", "status": "validating|duplicate_candidate|routed", "duplicate_candidate": { "issue_id": "string", "match_confidence": number } | null }`
- **Errors:** 404 issue not found, 403 not the owning user, 409 issue already confirmed.

### POST `/api/v1/issues/{issue_id}/corroborate`
- **Purpose:** Citizen confirms a duplicate candidate is the same issue (or rejects it as different).
- **Auth required:** Yes.
- **Request payload:** `{ "is_same_issue": boolean }`
- **Response payload:** `{ "result": "merged_as_corroboration|created_as_new", "canonical_issue_id": "string" }`
- **Errors:** 404, 409 already resolved.

### GET `/api/v1/issues/{issue_id}`
- **Purpose:** Retrieve full issue detail including status history.
- **Auth required:** Yes (any authenticated role; citizen sees own/public fields only — see NFR-4/BR-9.2 privacy rules; authority/admin see full detail within their scope).
- **Response payload:**
```
{
  "issue_id": "string",
  "category": "string",
  "severity": "string",
  "status": "string",
  "location": { "lat": number, "lng": number, "address_text": "string" },
  "description": "string|null",
  "photos": [ { "photo_id": "string", "photo_type": "before|after", "url": "string" } ],
  "corroboration_count": number,
  "department_name": "string|null",
  "sla_deadline": "ISO8601 timestamp|null",
  "status_history": [ { "to_status": "string", "created_at": "ISO8601 timestamp", "reason": "string|null" } ]
}
```
- **Errors:** 403 if a citizen requests an issue with restricted fields beyond public scope, 404 not found.

### GET `/api/v1/issues`
- **Purpose:** List issues — for citizen "My Reports" (filtered to own), public map (filtered to public-safe fields), or authority dashboard (filtered to department/jurisdiction scope, with full detail).
- **Auth required:** Yes.
- **Query params:** `status`, `category`, `severity`, `ward_or_area_id`, `bounding_box` (for map views), `mine` (boolean, citizen-only), `limit`, `cursor`.
- **Response payload:** `{ "issues": [ ...issue summary objects... ], "next_cursor": "string|null" }`
- **Errors:** 400 invalid filter combination.

### POST `/api/v1/issues/{issue_id}/dispute-resolution`
- **Purpose:** Citizen disputes a `verified_resolved` or `inconclusive` result within the dispute window.
- **Auth required:** Yes, must be the original reporting user.
- **Request payload:** `{ "reason": "string|null" }`
- **Response payload:** `{ "issue_id": "string", "status": "disputed_resolution" }`
- **Errors:** 409 dispute window expired, 403 not the original reporter.

---

## 4. Issue Endpoints (Authority-Facing)

### GET `/api/v1/authority/issues`
- **Purpose:** Authority dashboard queue, scoped to the authenticated user's `department_id`/`jurisdiction_scope`.
- **Auth required:** Yes, role `authority`.
- **Query params:** `status`, `sla_risk` (`at_risk|breached|normal`), `limit`, `cursor`.
- **Response payload:** `{ "issues": [ ...issue summary with sla_deadline and time_remaining... ], "next_cursor": "string|null" }`
- **Errors:** 403 if attempting to access issues outside scope (should be structurally impossible given server-side scoping, but explicitly defined as a 403 case for defense-in-depth).

### POST `/api/v1/authority/issues/{issue_id}/status`
- **Purpose:** Update issue status (`in_progress`, or initiate `resolved` with after-photo).
- **Auth required:** Yes, role `authority`, must be within department/jurisdiction scope of the issue.
- **Request payload:** `{ "new_status": "in_progress|resolved", "after_photo_ref": "string (required if new_status=resolved)" }`
- **Response payload:** `{ "issue_id": "string", "status": "in_progress|resolved|verifying" }`
- **Errors:** 422 missing after-photo for `resolved`, 409 illegal state transition per canonical state machine, 403 out of scope.

### POST `/api/v1/authority/issues/{issue_id}/reassign`
- **Purpose:** Authority reassigns a misrouted issue to a different department.
- **Auth required:** Yes, role `authority`.
- **Request payload:** `{ "new_department_id": "string", "reason": "string" }`
- **Response payload:** `{ "issue_id": "string", "department_id": "string", "status": "routed" }`
- **Errors:** 404 unknown department, 400 missing reason.

---

## 5. Admin Endpoints

### GET / PUT `/api/v1/admin/sla-config`
- **Purpose:** View/update SLA thresholds per category × severity.
- **Auth required:** Yes, role `admin`.
- **PUT request payload:** `{ "category": "string", "severity": "string", "sla_hours": number }`
- **Response payload:** `{ "config_id": "string", "category": "string", "severity": "string", "sla_hours": number, "updated_at": "ISO8601 timestamp" }`
- **Errors:** 400 invalid category/severity enum, 403 non-admin.

### GET / PUT `/api/v1/admin/jurisdiction-mapping`
- **Purpose:** View/update ward/area → department mapping.
- **Auth required:** Yes, role `admin`.
- **PUT request payload:** `{ "ward_or_area_id": "string", "category": "string", "department_id": "string" }`
- **Response payload:** `{ "mapping_id": "string", ...echoed fields... }`
- **Errors:** 404 unknown department_id, 409 conflicting mapping without explicit replace flag.

### GET `/api/v1/admin/agent-decision-log`
- **Purpose:** Audit log retrieval for dispute resolution/tuning.
- **Auth required:** Yes, role `admin`.
- **Query params:** `agent_type`, `issue_id`, `date_from`, `date_to`, `limit`, `cursor`.
- **Response payload:** `{ "logs": [ { "log_id": "string", "agent_type": "string", "input_summary": "string", "output_summary": "string", "confidence_score": number|null, "created_at": "ISO8601 timestamp" } ], "next_cursor": "string|null" }`

### GET `/api/v1/admin/users` / POST `/api/v1/admin/users`
- **Purpose:** Manage authority/admin accounts and their department/jurisdiction scoping.
- **Auth required:** Yes, role `admin`.
- **POST request payload:** `{ "email": "string", "role": "authority|admin", "department_id": "string|null", "jurisdiction_scope": ["string"] }`
- **Response payload:** `{ "user_id": "string", ...echoed fields..., "invite_sent": true }`
- **Errors:** 400 invalid role/department combination, 409 email already registered.

---

## 6. Map, Forecast & Reporting Endpoints

### GET `/api/v1/map/issues` (public)
- **Purpose:** Public map view of issues (privacy-filtered).
- **Auth required:** No (public read endpoint).
- **Query params:** `bounding_box`, `category`, `status`.
- **Response payload:** `{ "issues": [ { "issue_id": "string", "category": "string", "severity": "string", "status": "string", "location": { "lat": number, "lng": number } } ] }`
- **Note:** Never includes reporter identity, contact info, or full description text beyond what is explicitly public per BR-9.2.

### GET `/api/v1/map/hotspot-forecasts` (public, filtered)
- **Purpose:** Public-visible predictive hotspot layer.
- **Auth required:** No.
- **Response payload:** `{ "forecasts": [ { "forecast_id": "string", "ward_or_area_id": "string", "predicted_category": "string", "risk_score": number, "generated_at": "ISO8601 timestamp", "valid_until": "ISO8601 timestamp" } ] }`
- **Note:** Only returns forecasts where `is_public_visible = true` per BR in Feature 6.

### GET `/api/v1/admin/map/hotspot-forecasts` (full, including suppressed)
- **Purpose:** Admin/authority view including low-confidence/suppressed forecasts.
- **Auth required:** Yes, role `admin` or `authority`.

### GET `/api/v1/impact-reports`
- **Purpose:** Retrieve generated impact reports.
- **Auth required:** No for summary view (public trust-building); admin/authority for full export.
- **Query params:** `ward_or_area_id`, `period_start`, `period_end`.
- **Response payload:** `{ "reports": [ ...ImpactReport fields per database_design.md... ] }`

### POST `/api/v1/admin/impact-reports/generate`
- **Purpose:** Manually trigger impact report generation for a given ward/period (in addition to scheduled auto-generation).
- **Auth required:** Yes, role `admin`.
- **Request payload:** `{ "ward_or_area_id": "string", "period_start": "ISO8601", "period_end": "ISO8601" }`
- **Response payload:** `{ "report_id": "string", "status": "generated" }`
- **Errors:** 422 insufficient issue count for the period (per validation rule in Feature 7).

---

## 7. Internal/System Endpoints (Agent-Triggered, Not User-Facing)

These are invoked by the orchestrator or scheduler, not by frontend clients, but are documented for completeness since coding agents implementing the orchestrator need this contract.

### POST `/internal/v1/agents/escalation/run-cycle`
- **Purpose:** Triggered by the scheduler (e.g., hourly) to evaluate all active issues against SLA.
- **Auth required:** Internal service credential only (never exposed publicly).
- **Response payload:** `{ "evaluated_count": number, "escalated_count": number, "publicly_escalated_count": number }`

### POST `/internal/v1/agents/predictor/run-cycle`
- **Purpose:** Triggered by the scheduler (e.g., weekly) to regenerate hotspot forecasts.
- **Auth required:** Internal service credential only.
- **Response payload:** `{ "forecasts_generated": number, "areas_with_insufficient_data": number }`

---

## 8. Error Response Reference Table

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed/missing required field |
| `INVALID_CIVIC_ISSUE` | 400 | AI rejected image as non-civic infrastructure |
| `UNAUTHENTICATED` | 401 | Missing/invalid auth token |
| `FORBIDDEN_SCOPE` | 403 | Authenticated but outside role/jurisdiction scope |
| `NOT_FOUND` | 404 | Resource does not exist |
| `INVALID_STATE_TRANSITION` | 409 | Requested status change violates canonical state machine |
| `DUPLICATE_IDEMPOTENCY_KEY` | 409 | Retried request with same key but different payload |
| `MISSING_REQUIRED_EVIDENCE` | 422 | e.g., resolved without after-photo |
| `OUTSIDE_SERVICE_AREA` | 422 | Location outside supported bounding box |
| `INSUFFICIENT_DATA` | 422 | Report generation/forecast requested below minimum data threshold |
| `RATE_LIMITED` | 429 | Too many requests from this client/session |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
