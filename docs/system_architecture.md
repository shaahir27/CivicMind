> **[ARCHIVE NOTICE: PLEASE READ]**
> This document was generated during the initial design phase of CivicSense (formerly CivicMind). As the project was actively developed, the architecture evolved into a robust TypeScript monorepo with dedicated packages (Landing Page, Admin Console, etc.) and replaced some proposed technologies (e.g., BigQuery, Cloud Scheduler) with Firebase and internal cron jobs. 
> 
> **For the current, live architecture and deployment instructions, please refer to the main [`README.md`](../README.md) at the root of the repository.**

---

# CivicMind — System Architecture

> This document describes architecture only — no code. It must remain consistent with the agent orchestration diagram supplied as the canonical visual reference ("CivicMind — Agent orchestration stack") and with `database_design.md` / `api_specification.md` for entity and endpoint consistency.

---

## 1. High-Level Architecture

CivicMind is composed of five layers, matching the canonical architecture diagram:

1. **Citizen Layer** — citizen-facing report submission (photo, location, description).
2. **Orchestration Layer** — a central Agent Orchestrator (Gemini Pro–based reasoning engine) that coordinates all downstream agents, manages issue state, and routes decisions between agents.
3. **Agent Layer**, split into two functional groups:
   - **Intake agents (Phase 1–3):** Reporter Agent, Validator Agent, Router Agent.
   - **Resolution agents (Phase 4–6):** Escalation Agent, Verifier Agent, Predictor Agent.
4. **Shared Data Layer** — Firestore (issues/users/state), Cloud Storage (images/evidence), BigQuery (analytics/trends), Google Maps Platform (geo/clustering).
5. **Output Layer** — Citizen App, Authority Portal, Predictive Map, Impact Reports.

**Architectural principle:** The orchestrator is the *only* component that talks to every agent. Agents do not call each other directly. This keeps each agent independently testable and replaceable, and gives the orchestrator a single place to manage issue state transitions consistently with the canonical state machine in `user_flows.md`.

**Data flow summary:**
Citizen submits → Orchestrator receives event → Orchestrator invokes Reporter Agent → result written to Firestore → Orchestrator invokes Validator Agent → result written to Firestore → (if unique) Orchestrator invokes Router Agent → result written to Firestore, issue appears in Authority Portal → Escalation Agent runs on independent scheduled cycles reading from Firestore, not directly invoked per-request → Authority submits resolution → Orchestrator invokes Verifier Agent → result written to Firestore → Predictor Agent runs on independent scheduled cycles reading aggregated historical data from BigQuery → forecasts written back for map consumption.

---

## 2. Frontend Architecture

Two distinct frontend surfaces, sharing a common design system and component library where feasible:

### 2.1 Citizen App
- **Platform:** Mobile-first responsive web app (installable as a PWA) to maximize reach without requiring app-store distribution during hackathon judging; a native app shell is a roadmap item, not MVP.
- **Core screens:** Onboarding, Home/Map, Report Capture, Report Confirmation/Status, My Reports, Issue Detail/Timeline, Notifications, Leaderboard (Should/Nice-to-Have), Profile.
- **State management approach:** Client-side state should treat each Issue as a single source-of-truth object synced from the backend (Firestore real-time listeners are the natural fit given the data layer choice), so status changes (e.g., escalation, verification) reflect live without manual refresh.
- **Offline behavior:** Report drafts (photo + location + text) are retained client-side until successful submission; full offline issue browsing is a Should-Have, not MVP.

### 2.2 Authority Portal
- **Platform:** Desktop-first responsive web app (authority staff predominantly work at a desk/office terminal).
- **Core screens:** Login, Department Dashboard (issue queue), Issue Detail/Action view, SLA Compliance view, Impact Report view (read access).
- **Real-time requirement:** Queue must reflect new routing and escalation events without requiring manual refresh, for demo credibility (live escalation should visibly move an issue's priority/tier during a judging demo).

### 2.3 Admin Console
- **Platform:** Desktop web app, access-restricted to `admin` role.
- **Core screens:** SLA Configuration, Jurisdiction Mapping, Agent Audit Log, User/Role Management, Predictive Model Review, Impact Report generation/export.

### 2.4 Shared Frontend Concerns
- Map rendering (citizen Home map, authority jurisdiction map, predictive hotspot map) is implemented via Google Maps Platform components consistently across all three surfaces to avoid divergent map UX.
- Localization layer supports at minimum English + one regional language (see NFR-5 in `product_requirements.md`); all user-facing strings must be externalized to a translation resource rather than hardcoded.

---

## 3. Backend Architecture

### 3.1 Orchestration Service
- A central orchestration service (conceptually mapped to "Agent Orchestrator (Gemini Pro)" in the architecture diagram) is responsible for:
  - Receiving citizen report submission events.
  - Sequencing agent invocations per the canonical state machine.
  - Persisting state transitions atomically (an issue should never be left in an ambiguous state if an agent call fails mid-pipeline — failed agent calls should retry or fall back to a safe default state, e.g., `submitted` with a flagged "pending validation retry" sub-state, rather than corrupting the record).
  - Emitting events/notifications to the Notification Service on every state transition.

### 3.2 Agent Services
Each agent is conceptually an independently deployable service/function invoked by the orchestrator (or, for Escalation/Predictor, invoked by a scheduler):

| Agent | Invocation Pattern | Primary Responsibility |
|---|---|---|
| Reporter Agent | Synchronous, per-submission | Vision-based classification + severity scoring |
| Validator Agent | Synchronous, per-submission (post-Reporter) | Duplicate detection, community consensus check |
| Router Agent | Synchronous, per-validated-issue | Department identification, formal complaint drafting |
| Escalation Agent | Scheduled (e.g., hourly cron/Cloud Scheduler), batch | SLA monitoring, auto-escalation across all active issues |
| Verifier Agent | Synchronous, per-resolution-submission | Before/after vision comparison |
| Predictor Agent | Scheduled (e.g., weekly), batch | Historical pattern analysis, hotspot forecast generation |

### 3.3 Notification Service
- Decoupled from the orchestrator via an event/message pattern (the orchestrator emits a "state changed" event; the Notification Service subscribes and fans out to push/SMS/email channels).
- This decoupling means notification-channel outages never block the core issue-processing pipeline.

### 3.4 API Gateway / Backend-for-Frontend
- A single API layer fronts all three frontend surfaces (Citizen App, Authority Portal, Admin Console), enforcing role-based access control consistently rather than each surface implementing its own auth logic. See `api_specification.md` for endpoint-level detail.

### 3.5 Audit/Logging
- Every agent decision (input summary, output, confidence score, timestamp, agent identity/version) is written to an append-only audit log, separate from the mutable Issue record, satisfying NFR-6 (Auditability) without bloating the primary issue document.

---

## 4. Database Architecture

See `database_design.md` for full entity/field detail. At the architectural level:

- **Firestore** (or equivalent managed NoSQL document store) is the primary operational store for Issues, Users, Authorities, and live state — chosen for its native real-time listener support, which directly serves the frontend "live status without refresh" requirement.
- **Cloud Storage** (or equivalent object storage) holds all photo evidence (before/after images), referenced by URL/path from Issue and Verification records — never storing binary image data directly in the document store.
- **BigQuery** (or equivalent analytical warehouse) is fed denormalized/aggregated issue data on a scheduled export, used exclusively for analytics, trend computation, impact-report generation, and Predictor Agent training/inference input — keeping heavy analytical queries off the operational data path.
- **Audit Log store** can be a dedicated Firestore collection or BigQuery table depending on query pattern needs (operational lookups → Firestore; long-range trend audit → BigQuery); both are acceptable, document the choice made at implementation time in this same section for future agents to follow consistently.

---

## 5. External Services / APIs

| Service | Purpose | Notes |
|---|---|---|
| Gemini Pro (or equivalent multimodal LLM) | Orchestrator reasoning, Router Agent complaint drafting, general natural-language tasks | Central reasoning engine referenced throughout |
| Gemini Vision (or equivalent vision-capable model) | Reporter Agent classification/severity scoring, Verifier Agent before/after comparison | Vision tasks are functionally distinct from text reasoning and should be treated as a separate capability even if served by the same underlying model family |
| Vertex AI (or equivalent ML platform) | Predictor Agent pattern modeling / forecasting | Batch/scheduled use only, not in the synchronous citizen-facing path |
| Google Maps Platform | Geocoding (manual pin-drop resolution), reverse geocoding (address-from-coordinates for complaint drafting), map rendering, geo-clustering for hotspots | Used by both frontend (map rendering) and backend (geocoding, jurisdiction lookup support) |
| SMS/Email/Push provider | Citizen and authority notifications | Provider-agnostic; channel availability determines which is used per user preference |
| Authentication provider (e.g., Firebase Auth or equivalent) | Citizen account creation (OTP/magic link), Authority/Admin login (credentialed) | Role claims (`citizen` / `authority` / `admin`) attached at the identity layer, consumed by the API Gateway for access control |

---

## 6. AI/ML Components

| Component | Model Type | Input | Output | Notes |
|---|---|---|---|---|
| Reporter Agent — Classifier | Vision-language multimodal model | Photo(s) | Category label + confidence, severity label + confidence | Single-pass inference, no fine-tuning required for MVP; prompt-engineered classification against the fixed category enum |
| Validator Agent — Duplicate Matcher | Combination of geospatial filtering (deterministic) + visual similarity scoring (vision model) | New issue (photo, location, category) + candidate existing issues in radius | Match confidence score | Geospatial filter narrows candidates before any model inference is invoked, for cost efficiency (NFR-8) |
| Router Agent — Drafting | Text-generation LLM | Issue metadata + jurisdiction mapping lookup result | Formal complaint text | Department identification itself is a deterministic lookup (ward × category → department); only the complaint text drafting uses generative AI |
| Escalation Agent — SLA Logic | Deterministic rules engine (no ML) | Issue timestamps, SLA config | Escalation decision | Explicitly non-AI; included in the "agent stack" because it behaves autonomously, not because it uses ML — this distinction should guide implementation: do not over-engineer this as a model-based component |
| Verifier Agent — Resolution Comparison | Vision-language multimodal model, image-pair comparison | Before photo + after photo + category | Verification confidence + rationale text | Category-aware prompting (different expected "after" appearance per category) is required per BR in `feature_specifications.md` Feature 5 |
| Predictor Agent — Hotspot Forecasting | Time-series / spatial pattern model (e.g., a forecasting model trained or prompted against historical aggregates) | Historical issue records (category, location, timestamp, recurrence) from BigQuery | Geo-clustered forecast with risk score per category | Batch/offline; for hackathon MVP this may be implemented as a clearly-labeled heuristic/statistical model (e.g., recency- and frequency-weighted geo-clustering) rather than a fully trained ML model, with a documented upgrade path to a true Vertex AI-trained model post-hackathon |

**Cost/latency design note:** Only the Reporter, Validator (visual step), Router (drafting step), and Verifier agents sit in a synchronous, citizen/authority-facing request path and must meet the latency targets in NFR-1. Escalation and Predictor agents are explicitly batch/scheduled and are not subject to the same latency budget.

---

## 7. Deployment Architecture

- **Hosting model:** Serverless/managed-service-first (e.g., Cloud Run/Cloud Functions for agent services and orchestrator, managed Firestore, managed Cloud Storage, managed BigQuery) to minimize infrastructure management during a short hackathon build window and to scale to zero between bursts of demo traffic.
- **Environment separation:** A single demo environment is sufficient for hackathon scope; a documented `dev`/`prod` separation is a roadmap item for post-hackathon productionization (see `development_plan.md` Phase 5 and `README.md` Future Roadmap).
- **Scheduler:** A managed scheduler (e.g., Cloud Scheduler) triggers the Escalation Agent's periodic cycle and the Predictor Agent's weekly forecast regeneration independently of user traffic.
- **Secrets/config management:** API keys (LLM provider, Maps Platform, notification providers) are stored in a managed secrets store, never embedded in client-side code, consistent with NFR-4 (Security & Privacy).
- **Observability:** Minimum viable observability for a hackathon demo: structured logging per agent invocation (feeding the audit log described in Section 3.5) plus basic uptime/error-rate monitoring on the orchestrator and API gateway. Full APM/tracing is a roadmap item.

---

## 8. Architecture Diagram Cross-Reference

This document's component list is a direct textual mapping of the supplied "CivicMind — Agent orchestration stack" diagram:

- Citizen layer → Section 2.1 (Citizen App) + Section 1 data flow.
- Agent orchestrator (Gemini Pro) → Section 3.1.
- Phase 1–3 (Reporter, Validator, Router agents) → Section 3.2 table, rows 1–3.
- Phase 4–6 (Escalation, Verifier, Predictor agents) → Section 3.2 table, rows 4–6.
- Shared data layer (Firestore, Cloud Storage, BigQuery, Maps Platform) → Section 4 and Section 5.
- Outputs (Citizen app, Authority portal, Predictive map, Impact reports) → Section 2 (frontend surfaces) and Feature 7/Feature 6 in `feature_specifications.md`.

Any future architectural change must be reflected in both this document and the visual diagram to keep the two in sync.
