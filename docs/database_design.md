> **[ARCHIVE NOTICE: PLEASE READ]**
> This document was generated during the initial design phase of CivicSense (formerly CivicMind). As the project was actively developed, the architecture evolved into a robust TypeScript monorepo with dedicated packages (Landing Page, Admin Console, etc.) and replaced some proposed technologies (e.g., BigQuery, Cloud Scheduler) with Firebase and internal cron jobs. 
> 
> **For the current, live architecture and deployment instructions, please refer to the main [`README.md`](../README.md) at the root of the repository.**

---

# CivicMind — Database Design

> Schema is described in implementation-agnostic relational terms (entities, fields, relationships, constraints) for clarity, even though the recommended physical store is a document database (Firestore) per `system_architecture.md`. Each entity below maps to one Firestore collection (or one BigQuery table for analytical entities) unless noted otherwise. No code/queries included — this is a blueprint only.

---

## 1. Entity Overview

| Entity | Purpose | Primary Store |
|---|---|---|
| User | Citizens, authority staff, and admins | Firestore (`users`) |
| Department | Authority/department reference data | Firestore (`departments`) |
| JurisdictionMapping | Ward/area → Department mapping | Firestore (`jurisdiction_mappings`) |
| Issue | Core civic issue record | Firestore (`issues`) |
| IssuePhoto | Photo evidence (before/after) | Firestore (`issue_photos`) metadata + Cloud Storage (binary) |
| IssueStatusHistory | Immutable state-transition log per issue | Firestore (`issue_status_history`) |
| Corroboration | Citizen corroboration links to a canonical issue | Firestore (`corroborations`) |
| AgentDecisionLog | Audit log of every agent decision | Firestore (`agent_decision_log`) or BigQuery (`agent_decision_log`) |
| SLAConfig | SLA thresholds per category × severity | Firestore (`sla_config`) |
| EscalationTier | Escalation tier mapping per department | Firestore (`escalation_tiers`) |
| Notification | Notification delivery record | Firestore (`notifications`) |
| HeroPointsLedger | Gamification point transactions | Firestore (`hero_points_ledger`) |
| HotspotForecast | Predictor Agent output | Firestore (`hotspot_forecasts`) (current/live) + BigQuery (historical) |
| ImpactReport | Generated periodic impact reports | Firestore (`impact_reports`) |
| IssueAggregate (analytical) | Denormalized export for BigQuery analytics | BigQuery (`issue_aggregates`) |

---

## 2. Entity Detail

### 2.1 User
| Field | Type | Constraints | Notes |
|---|---|---|---|
| user_id | string (UUID) | Primary Key | |
| role | enum (`citizen`, `authority`, `admin`) | Required | Drives RBAC |
| display_name | string | Optional | |
| phone | string | Unique if present, nullable | Citizen contact; required for non-guest accounts |
| email | string | Unique if present, nullable | Authority/admin login identifier; citizen optional |
| auth_provider_id | string | Required, unique | Maps to identity provider record |
| department_id | string (FK → Department.department_id) | Required if role = `authority`, else null | |
| jurisdiction_scope | array of ward/area IDs | Required if role = `authority`, else null | Scopes dashboard visibility |
| hero_points_balance | integer | Default 0 | Denormalized cache; ledger is source of truth |
| is_guest | boolean | Default false | True for anonymous citizen sessions |
| preferred_language | string | Default `en` | |
| created_at | timestamp | Required | |
| updated_at | timestamp | Required | |

**Indexing:** Index on `phone`, `email` (uniqueness + lookup), composite index on (`role`, `department_id`) for authority queries.

### 2.2 Department
| Field | Type | Constraints | Notes |
|---|---|---|---|
| department_id | string (UUID) | Primary Key | |
| name | string | Required | e.g., "BESCOM," "GCC — Ward 12 Sanitation" |
| category_scope | array of enum (Issue.category) | Required | Which issue categories this department handles |
| contact_channel | string | Optional | Email/API endpoint for post-MVP integration |
| escalation_tier_1_user_id | string (FK → User.user_id) | Optional | |
| created_at | timestamp | Required | |

**Indexing:** Index on `category_scope` (array-contains queries for routing lookups).

### 2.3 JurisdictionMapping
| Field | Type | Constraints | Notes |
|---|---|---|---|
| mapping_id | string (UUID) | Primary Key | |
| ward_or_area_id | string | Required | References a static geo-reference dataset |
| category | enum (Issue.category) | Required | |
| department_id | string (FK → Department.department_id) | Required | |
| is_fallback | boolean | Default false | True for "City Admin" generic fallback entries |

**Constraint:** Unique composite (`ward_or_area_id`, `category`) — exactly one department owns a given category in a given ward at any time (admin edits replace, not append).

**Indexing:** Composite index on (`ward_or_area_id`, `category`).

### 2.4 Issue (core entity)
| Field | Type | Constraints | Notes |
|---|---|---|---|
| issue_id | string (UUID) | Primary Key | |
| reporter_user_id | string (FK → User.user_id) | Nullable | Null for fully anonymous guest reports without recovery |
| category | enum (`pothole`, `streetlight`, `garbage`, `water_leakage`, `traffic_signal`, `drainage`, `road_damage`, `other`) | Required | Set by Reporter Agent, confirmable by citizen |
| category_confidence | float (0.0–1.0) | Required | |
| severity | enum (`low`, `medium`, `high`, `critical`) | Required | |
| severity_confidence | float (0.0–1.0) | Required | |
| description | string (max 500 chars) | Optional | |
| location_lat | float | Required | |
| location_lng | float | Required | |
| location_address_text | string | Optional | Reverse-geocoded, used in drafted complaints |
| ward_or_area_id | string | Required | Resolved from coordinates at submission time |
| status | enum (see canonical state machine in `user_flows.md`) | Required | |
| department_id | string (FK → Department.department_id) | Nullable until routed | |
| sla_deadline | timestamp | Nullable until routed | Computed at routing time from SLAConfig |
| escalation_tier_current | integer | Default 0 | 0 = not escalated |
| corroboration_count | integer | Default 1 | Self-counts as 1 |
| is_canonical | boolean | Default true | False if this record was merged into another as a duplicate |
| canonical_issue_id | string (FK → Issue.issue_id) | Nullable | Set if `is_canonical = false` |
| hotspot_forecast_id | string (FK → HotspotForecast.forecast_id) | Nullable | Set if this issue originated from/confirms a predicted hotspot |
| created_at | timestamp | Required | |
| updated_at | timestamp | Required | |
| resolved_at | timestamp | Nullable | |
| verified_at | timestamp | Nullable | |

**Constraints:**
- `status` transitions must follow the canonical state machine; enforced at the API/orchestrator layer, not the database layer (document stores generally cannot enforce this natively — documented here so any implementing agent enforces it in application logic).
- `category_confidence` and `severity_confidence` must be within [0.0, 1.0].

**Indexing:** Composite index on (`department_id`, `status`) for authority dashboard queries; composite index on (`ward_or_area_id`, `category`, `created_at`) for duplicate-detection candidate lookup and hotspot analysis; composite index on (`status`, `sla_deadline`) for Escalation Agent's scheduled scan.

### 2.5 IssuePhoto
| Field | Type | Constraints | Notes |
|---|---|---|---|
| photo_id | string (UUID) | Primary Key | |
| issue_id | string (FK → Issue.issue_id) | Required | |
| photo_type | enum (`before`, `after`) | Required | |
| storage_path | string | Required | Cloud Storage object path |
| uploaded_by_user_id | string (FK → User.user_id) | Required | |
| geotag_lat | float | Optional | Used to validate after-photo proximity (BR in Feature 5) |
| geotag_lng | float | Optional | |
| created_at | timestamp | Required | |

**Indexing:** Index on `issue_id`.

### 2.6 IssueStatusHistory
| Field | Type | Constraints | Notes |
|---|---|---|---|
| history_id | string (UUID) | Primary Key | |
| issue_id | string (FK → Issue.issue_id) | Required | |
| from_status | enum | Nullable (null for initial `submitted`) | |
| to_status | enum | Required | |
| actor_type | enum (`citizen`, `authority`, `admin`, `agent:reporter`, `agent:validator`, `agent:router`, `agent:escalation`, `agent:verifier`, `system`) | Required | |
| actor_id | string | Nullable | User ID if human actor |
| reason | string | Optional | Human-readable note (e.g., "SLA breached, auto-escalated to Tier 2") |
| created_at | timestamp | Required | Immutable, append-only |

**Constraint:** This collection is append-only; no updates or deletes permitted at the application layer (satisfies NFR-6 Auditability).

**Indexing:** Index on `issue_id`, ordered by `created_at`.

### 2.7 Corroboration
| Field | Type | Constraints | Notes |
|---|---|---|---|
| corroboration_id | string (UUID) | Primary Key | |
| canonical_issue_id | string (FK → Issue.issue_id) | Required | |
| corroborating_user_id | string (FK → User.user_id) | Nullable for guests | |
| original_submitted_issue_id | string (FK → Issue.issue_id) | Required | The duplicate report that triggered this corroboration |
| match_confidence | float | Required | From Validator Agent |
| created_at | timestamp | Required | |

**Constraint:** Unique composite (`canonical_issue_id`, `corroborating_user_id`) when `corroborating_user_id` is not null — prevents a registered user double-corroborating the same issue.

### 2.8 AgentDecisionLog
| Field | Type | Constraints | Notes |
|---|---|---|---|
| log_id | string (UUID) | Primary Key | |
| issue_id | string (FK → Issue.issue_id) | Nullable | Null for Predictor Agent runs not tied to a single issue |
| agent_type | enum (`reporter`, `validator`, `router`, `escalation`, `verifier`, `predictor`) | Required | |
| input_summary | string (JSON-serialized text) | Required | Summarized, not full raw payload, for storage efficiency |
| output_summary | string (JSON-serialized text) | Required | |
| confidence_score | float | Nullable | Not applicable to deterministic Escalation Agent |
| agent_version | string | Required | Supports reproducibility/debugging |
| created_at | timestamp | Required | |

**Indexing:** Composite index on (`agent_type`, `created_at`); index on `issue_id`.

### 2.9 SLAConfig
| Field | Type | Constraints | Notes |
|---|---|---|---|
| config_id | string (UUID) | Primary Key | |
| category | enum (Issue.category) | Required | |
| severity | enum (Issue.severity) | Required | |
| sla_hours | integer | Required, > 0 | |
| updated_by_admin_id | string (FK → User.user_id) | Required | |
| updated_at | timestamp | Required | |

**Constraint:** Unique composite (`category`, `severity`) — one active SLA value per combination; historical values are not overwritten in place but versioned via `updated_at` ordering if audit history is required (Should-Have).

### 2.10 EscalationTier
| Field | Type | Constraints | Notes |
|---|---|---|---|
| tier_id | string (UUID) | Primary Key | |
| department_id | string (FK → Department.department_id) | Required | |
| tier_level | integer | Required, ≥ 1 | 1 = first responder, increasing = higher authority |
| responsible_user_id | string (FK → User.user_id) | Optional | May be null if tier maps to a role/queue rather than a named individual |
| tier_label | string | Required | e.g., "Department Head," "Ward Councilor" |

**Constraint:** Unique composite (`department_id`, `tier_level`).

### 2.11 Notification
| Field | Type | Constraints | Notes |
|---|---|---|---|
| notification_id | string (UUID) | Primary Key | |
| recipient_user_id | string (FK → User.user_id) | Required | |
| issue_id | string (FK → Issue.issue_id) | Nullable | Some notifications (e.g., impact report ready) are not issue-specific |
| channel | enum (`push`, `sms`, `email`) | Required | |
| message_text | string | Required | |
| delivery_status | enum (`pending`, `sent`, `failed`) | Required | |
| created_at | timestamp | Required | |

**Indexing:** Composite index on (`recipient_user_id`, `created_at`).

### 2.12 HeroPointsLedger
| Field | Type | Constraints | Notes |
|---|---|---|---|
| ledger_id | string (UUID) | Primary Key | |
| user_id | string (FK → User.user_id) | Required | |
| issue_id | string (FK → Issue.issue_id) | Required | |
| points | integer | Required, can be positive only (no negative deductions in MVP) | |
| reason | enum (`routed`, `verified_resolved_bonus`) | Required | |
| created_at | timestamp | Required | |

**Constraint:** Unique composite (`user_id`, `issue_id`, `reason`) — prevents duplicate point awards for the same event.

### 2.13 HotspotForecast
| Field | Type | Constraints | Notes |
|---|---|---|---|
| forecast_id | string (UUID) | Primary Key | |
| ward_or_area_id | string | Required | |
| predicted_category | enum (Issue.category) | Required | |
| risk_score | float (0.0–1.0) | Required | |
| confidence | float (0.0–1.0) | Required | |
| is_public_visible | boolean | Default false until confidence threshold met | Per BR in Feature 6 |
| generated_at | timestamp | Required | |
| valid_until | timestamp | Required | Forecasts expire and are regenerated on schedule |

**Indexing:** Composite index on (`ward_or_area_id`, `generated_at`).

### 2.14 ImpactReport
| Field | Type | Constraints | Notes |
|---|---|---|---|
| report_id | string (UUID) | Primary Key | |
| ward_or_area_id | string | Required | |
| period_start | timestamp | Required | |
| period_end | timestamp | Required | |
| total_issues | integer | Required | |
| resolution_rate | float | Required | |
| avg_resolution_hours | float | Required | |
| avg_verification_hours | float | Required | |
| escalation_rate | float | Required | |
| estimated_savings_value | float | Required | In local currency, labeled as estimate per BR-7.1 |
| civic_health_score | float (0–100) | Required | |
| generated_at | timestamp | Required | |

**Indexing:** Composite index on (`ward_or_area_id`, `period_start`).

### 2.15 IssueAggregate (BigQuery, analytical)
Denormalized, append-only export combining Issue + IssueStatusHistory + AgentDecisionLog fields needed for trend analysis and Predictor Agent input. Refreshed on a scheduled export job from Firestore; not a live source of truth, and never written to directly by application logic — it is a read replica for analytics only.

---

## 3. Relationship Summary

- User (1) — (N) Issue [as reporter]
- User (1) — (N) Issue [as authority, scoped via department_id]
- Department (1) — (N) Issue
- Department (1) — (N) JurisdictionMapping
- Department (1) — (N) EscalationTier
- Issue (1) — (N) IssuePhoto
- Issue (1) — (N) IssueStatusHistory
- Issue (1) — (N) Corroboration [as canonical]
- Issue (1) — (N) AgentDecisionLog
- Issue (1) — (N) Notification
- Issue (1) — (N) HeroPointsLedger
- HotspotForecast (1) — (N) Issue [optional linkage]

---

## 4. General Constraints & Recommendations

- All timestamp fields use UTC storage with client-side localization for display.
- All `*_id` fields use UUIDv4 (or Firestore auto-generated document IDs treated as opaque strings) — never sequential integers, to avoid enumeration concerns given public-facing issue visibility.
- Soft-deletion only: no entity in this schema should be hard-deleted in the MVP; deactivation/archival flags should be added if removal is needed (not specified further here as it is out of MVP scope — see `mvp_scope.md`).
- Given Firestore's document-store nature, all "Required" constraints and uniqueness constraints described above must be enforced at the application/orchestrator layer, since Firestore does not natively enforce relational constraints — this is a critical implementation note for any coding agent building against this schema.
