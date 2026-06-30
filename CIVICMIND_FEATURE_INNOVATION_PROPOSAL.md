# CivicMind — Feature Innovation Proposal: Authority & Admin Roles

> **Author framing:** This proposal is written from the perspective of a senior systems designer/architect reviewing CivicMind against how real-world municipal 311 platforms (OpenGov 311, Civita, GOGov, Catalis Request311, Oxmaint CMMS, SeeClickFix/CivicPlus) and modern civic-tech engagement platforms (Consul, GovPilot, iTribe) have evolved. The Citizen App already has strong differentiation (AI classification, duplicate detection, gamification, 7 languages). **Authority and Admin are currently thin** — mostly CRUD screens around a queue and some config tables. This document proposes a prioritized set of additions that close that gap, grounded in patterns proven in production civic-tech systems, while being explicit about how each feature integrates with CivicMind's existing architecture **without breaking it**.

---

## Design Constraints (read before building anything)

Every feature below must respect these non-negotiables so nothing existing breaks:

1. **Additive only.** No proposed feature renames, removes, or repurposes an existing Firestore field, collection, enum value, or API response field. New data goes in new collections or new optional fields.
2. **State machine is frozen.** The existing 14-state `IssueStatus` machine and its legal transitions are not to be modified. New features must hang off existing states (e.g., triggered when an issue *enters* `verified_resolved`) rather than introduce new statuses into the core issue lifecycle. If a feature genuinely needs a new state, it should live in a **separate** entity (e.g., a `WorkOrder` document referencing an `issue_id`) rather than extending `IssueStatus`.
3. **RBAC pattern is reused, not reinvented.** Every new authority/admin endpoint must go through the existing `requireAuthority` / `requireAdmin` / `assertWithinJurisdiction` middleware chain in `middleware/rbac.ts`. No new auth pattern.
4. **Agents stay single-responsibility.** If a feature needs AI, prefer adding a new dedicated agent (matching the existing pattern of Reporter/Validator/Router/Escalation/Verifier/Predictor) over bolting new logic into an existing agent's prompt.
5. **Every new feature must degrade gracefully without an API key**, the same way the existing Router Agent template-fallback works when Gemini is unavailable.

---

## Part A — Authority Portal: From "Inbox" to "Field Operations Console"

Research basis: modern 311/CMMS platforms (Oxmaint, OpenGov, Catalis) treat the authority side not as a ticket inbox but as a **field operations system** — work order assignment, route optimization, GIS-based workload visualization, and mobile-first crew tooling are now table stakes, not differentiators. CivicMind's authority side currently stops at "see ticket, click resolve."

### A1. Work Order & Crew Assignment Layer (High Priority)

**The gap:** Today, "authority" is treated as a single undifferentiated actor per department. In reality, a department has a supervisor and multiple field workers. There's no way to assign a specific ticket to a specific person.

**Proposed addition:**
- New collection `field_workers` (`worker_id`, `department_id`, `display_name`, `skills[]`, `is_active`, `current_workload_count`).
- New optional field on `Issue`: `assigned_worker_id` (nullable — does not affect the existing state machine).
- New endpoint `POST /api/v1/authority/issues/:issue_id/assign` (supervisor-only, scoped by existing `assertAuthorityOwnsIssue` + `assertWithinJurisdiction`) that sets `assigned_worker_id`.
- New screen in `authority-portal`: a Kanban-style "My Team" board — columns per worker, cards per assigned issue, drag-to-reassign.

This mirrors what Oxmaint and OpenGov call "work order management" — the layer that exists between "ticket received" and "ticket resolved."

### A2. GIS Workload Map (High Priority, cheap to build — you already have the map SDK)

**The gap:** `authority-portal` has no map at all today — only the Citizen App and Admin Console use `@vis.gl/react-google-maps`. Authorities currently triage by scrolling a list, not by geography.

**Proposed addition:** A new `DashboardScreen` map tab showing all department issues as pins, color-coded by SLA risk, with optional clustering when issue density is high in one ward. This directly mirrors the GIS-prioritization pattern used by Catalis Request311: "when location data is integrated into a service request platform, agencies can better understand the geographic context behind the work... better crew deployment based on proximity and service density." No new backend endpoint needed — this reuses the existing `GET /authority/issues` response, which already includes `location.lat/lng`.

### A3. Route Optimization for Field Visits (Medium Priority)

**The gap:** A worker assigned 6 potholes across a ward has no help sequencing their day.

**Proposed addition:** Given a worker's assigned, unresolved issues for the day, call the Google Maps Directions API (waypoint optimization) to return an optimal visit order. Surface as a "Today's Route" button on the field worker's view. This is squarely in line with how production CMMS-311 integrations (Oxmaint: "Route optimization groups nearby jobs into efficient daily sequences") operate, and it's a genuinely novel feature relative to most hackathon-grade clones of this idea — most projects stop at "show pins on a map," not "sequence a workday."

### A4. In-App Two-Way Messaging Thread per Issue (Medium Priority)

**The gap:** Authority and citizen can only communicate through status transitions and canned notifications — there's no way for an authority worker to ask "can you confirm the exact pole number?" without a phone call.

**Proposed addition:** New collection `issue_comments` (`issue_id`, `author_type: citizen|authority|admin`, `author_id`, `body`, `created_at`). Render as a simple threaded comment list on `IssueDetailScreen` (authority) and `ConfirmationStatusScreen` (citizen). This is a small, low-risk addition that meaningfully closes a real communication gap and is standard in GOGov's "Unified Record View" pattern.

### A5. Authority Performance Scorecard (Medium Priority — pairs with Admin leaderboard below)

**The gap:** There is no feedback loop telling an individual officer or department how they're doing relative to peers.

**Proposed addition:** A read-only `SlaComplianceScreen` upgrade (this screen currently has zero backend wiring) pulling from the existing `agent-decision-log` and issue history to show: average time-to-acknowledge, average time-to-resolve, % verified on first attempt vs. disputed, and a department rank. No new write paths — purely an aggregation read endpoint (`GET /api/v1/authority/performance-summary`).

### A6. Mobile-Optimized Field Capture Mode (Low effort, high polish payoff)

**The gap:** `IssueDetailScreen`'s after-photo upload (`handleFile`) is a basic file input — fine on desktop, clunky on a phone in the field. GOGov's 2026 redesign explicitly calls out "full mobile optimization... field crews spend less time on status updates and more time on the work itself" as their headline feature.

**Proposed addition:** A responsive capture flow that opens the device camera directly (`<input capture="environment">`) and adds an offline-friendly queue (store the photo + intended status update in IndexedDB if the network is down, sync when back online) — directly addressing the "offline mode" pattern Oxmaint highlights for field crews in low-connectivity areas (common in real Indian wards).

---

## Part B — Admin Console: From "Config Panel" to "Civic Intelligence Platform"

Research basis: the admin side of leading platforms has moved from static config screens toward (a) AI-assisted oversight, (b) public transparency/open-data, and (c) cross-department accountability via leaderboards and benchmarking. CivicMind's admin console today is six separate CRUD-style screens with no synthesis layer tying them together.

### B1. Natural-Language Admin Copilot ("Ask CivicMind") (High Priority — strongest "wow" feature, fits your existing Gemini investment)

**The gap:** `AuditLogScreen` lets an admin filter logs, but answering a real question ("which ward had the most disputed resolutions last month and why?") requires manually cross-referencing several screens.

**Proposed addition:** A new lightweight chat panel in the Admin Console backed by a new agent, `CopilotAgent`, that:
1. Accepts a natural-language question.
2. Translates it into a constrained set of Firestore queries against existing collections only (issues, agent_decision_log, impact_reports, hotspot_forecasts) — never arbitrary writes.
3. Calls Gemini text generation to summarize the retrieved data into a plain-language answer.

This is the single highest-leverage feature on this list because it reuses 100% of your existing data model and Gemini integration — it's a read-only synthesis layer, not new state. It also directly matches where the industry is heading: Creatio's 311 CRM literature explicitly highlights "Customizable CRM Agents... helping teams scale operations" as the current frontier feature in this space.

### B2. Department & Ward Leaderboard (High Priority — cheap, visible, demo-friendly)

**The gap:** The Civic Health Score formula already exists (`admin.ts`, impact report generation) but is only ever computed for one ward/period at a time on manual request. There's no comparative view.

**Proposed addition:** A new `LeaderboardScreen` that runs the existing `generate` logic across all wards for the trailing 30 days and ranks them by `civic_health_score`. Zero new backend logic needed beyond a loop over existing jurisdiction mappings calling the existing generate function. This single screen turns an existing-but-buried metric into a genuinely compelling, screenshot-worthy feature, and mirrors how OpenGov explicitly pitches "Accountability with Data Dashboards... prove performance to leaders and the public."

### B3. Public-Facing Transparency Portal (Medium-High Priority)

**The gap:** Everything CivicMind computes (resolution rates, civic health scores, hotspot forecasts) is currently locked behind admin/authority login. Real civic-tech credibility comes from public transparency, not just internal dashboards — this is the core thesis of UNDP's and Harvard Ash Center's civic-tech frameworks researched for this proposal: transparency and open data are treated as a first-class pillar, not an afterthought.

**Proposed addition:** A new lightweight public route (no auth) under the existing `landing-page` package — `/transparency` — surfacing already-public-safe aggregates: total issues resolved city-wide, average resolution time, the leaderboard from B2, and the existing `is_public_visible` hotspot forecasts. This reuses the existing `GET /map/impact-reports` and `GET /map/hotspot-forecasts` public routes, which are already unauthenticated in `routes/map.ts` — meaning roughly half of this feature already exists in the backend and is simply not surfaced anywhere in the frontend.

### B4. Citizen Satisfaction Survey (CSAT) Post-Resolution (Medium Priority)

**The gap:** The Verifier Agent confirms a photo shows the issue fixed, but never asks the human who reported it whether they're actually satisfied. This is a real signal gap — a road can be "fixed" to AI-vision standard and still be a bad repair.

**Proposed addition:** New collection `csat_responses` (`issue_id`, `citizen_user_id`, `rating: 1-5`, `comment`, `created_at`). A simple one-tap rating prompt shown on `ConfirmationStatusScreen` once status reaches `verified_resolved`. Feed the aggregate rating into the Civic Health Score formula as a new optional weighted term (e.g., 10% weight, rebalancing the existing weights down proportionally) — this is the one place in this proposal that touches an existing formula, so it should be implemented as a feature-flagged addition (`csat_enabled` config) so the score calculation is backward compatible when no CSAT data exists yet for older issues.

### B5. Sentiment & Anomaly Monitoring on Agent Decisions (Medium Priority — strong "AI maturity" signal for judges)

**The gap:** The Agent Decision Log is a great audit trail, but nobody is watching it proactively. If the Verifier Agent's average confidence quietly started dropping department-wide, no one would notice until disputes spiked.

**Proposed addition:** A scheduled job (same `node-cron` pattern as Escalation/Predictor) that computes rolling 7-day average confidence per agent type and flags statistically significant drops (e.g., >15% below the 30-day baseline) as an `agent_health_alert` surfaced on the Admin dashboard. This is a low-cost addition since `agent_decision_log` already stores `confidence_score` for every decision — it's a query and a threshold, not new AI.

### B6. WhatsApp / SMS Reporting Channel (Medium Priority, high real-world impact for India context)

**The gap:** The entire intake funnel assumes a citizen has the PWA installed. Production 311 systems explicitly treat multi-channel intake (phone, SMS, web, walk-in) as core — Oxmaint's literature frames single-channel intake as the single biggest cause of municipalities losing ~34% of requests before a work order is ever created.

**Proposed addition:** A WhatsApp Business API (or Twilio) webhook endpoint `POST /api/v1/channels/whatsapp/inbound` that accepts an image + location pin sent via WhatsApp, maps it into the exact same `orchestrateIssueSubmission` function the Citizen App already calls, and replies with status updates over WhatsApp instead of in-app notifications. Because it reuses the existing orchestrator function unchanged, this is architecturally a new **intake adapter**, not a new pipeline — genuinely low risk despite sounding like a large feature.

### B7. Configurable Role Permissions (Low priority, but mentioned for completeness)

Currently `requireRole` only supports the three fixed roles. If you want a "Department Head" role distinct from a regular "Authority" worker (relevant once A1/A5 above exist), this would need a 4th role value added to the `UserRole` enum. Flagged as the **one place** in this whole proposal that touches an existing enum, so it should be done last and only if A1 (crew assignment) is actually built, since a flat "authority" role with no internal hierarchy is sufficient until then.

---

## Suggested Build Order (effort vs. impact)

| Priority | Feature | Effort | Why this order |
|---|---|---|---|
| 1 | B3 Public Transparency Portal | Very low | Backend already exists; pure frontend surfacing |
| 2 | B2 Department/Ward Leaderboard | Low | Reuses existing report-generation logic in a loop |
| 3 | A2 GIS Workload Map (authority) | Low | Reuses existing Maps SDK already in the repo |
| 4 | B1 "Ask CivicMind" Admin Copilot | Medium | Highest demo impact; pure read-only synthesis, no schema risk |
| 5 | A4 In-app messaging thread | Medium | Small new collection, clear UX win |
| 6 | A1 Work order / crew assignment | Medium-High | Foundational for A3, A5, A6 |
| 7 | A5 Authority performance scorecard | Medium | Depends on A1 data for full value |
| 8 | B4 CSAT survey | Medium | Touch the health-score formula carefully, feature-flagged |
| 9 | B5 Agent anomaly monitoring | Medium | Pure analytics over existing logs |
| 10 | A3 Route optimization | Medium-High | Needs A1 first; external Directions API cost/quota to manage |
| 11 | A6 Offline field capture | High | IndexedDB sync logic is the most complex item here |
| 12 | B6 WhatsApp channel | High | External API approval/setup overhead, not pure code risk |
| 13 | B7 Configurable role permissions | Low effort, but sequence-dependent | Only needed once A1 exists |

---

## Sources Consulted

This proposal is grounded in patterns documented across current civic-tech and municipal 311/CMMS literature, including OpenGov 311, Oxmaint municipal work order/CMMS integration documentation, Catalis Request311, GOGov's 2026 citizen request platform release notes, Creatio's 311 CRM feature overview, and civic-tech engagement frameworks from the Harvard Ash Center and UNDP's Civic Tech Innovation work. Specific feature claims above (route optimization, GIS hotspot prioritization, offline field sync, multi-channel intake loss rates, AI-agent-driven CRM automation) are drawn directly from these sources rather than invented, and are footnoted conceptually above per feature rather than as a single bibliography, since each maps to a distinct proposed feature.
