# CivicMind — Development Plan

> Practical implementation roadmap for a hackathon timeline (assumed 5–7 days). Phases are sequenced by dependency, not strictly by calendar day — teams with more parallel capacity can run some phases concurrently as noted. No code included; this is a planning document for coordinating AI coding agents and human developers together.

---

## Phase 1: Foundation

**Goal:** Establish the shared scaffolding every later phase depends on.

**Tasks:**
1. Set up the project repository structure (separate concerns for: Citizen App, Authority Portal/Admin Console, backend/orchestrator services, shared types/schema definitions).
2. Provision core managed services: Firestore (or chosen document store), Cloud Storage bucket, BigQuery dataset, identity/auth provider, Google Maps Platform API keys.
3. Define and seed reference data: jurisdiction/ward boundaries for the demo city/area, jurisdiction-to-department mapping table (per `database_design.md` Section 2.3), initial SLA configuration values (per Section 2.9), a small set of demo authority/admin accounts.
4. Stand up the API Gateway/backend-for-frontend skeleton with authentication wired to the identity provider and role-based access control scaffolding (citizen/authority/admin) in place before any business logic is added.
5. Establish the shared design system/component tokens referenced in `ui_ux_specification.md` (color-to-status mapping, typography, base components) so frontend work in later phases doesn't drift.

**Dependencies:** None — this phase blocks everything else and should be completed first, even under time pressure.

**Exit criteria:** A developer/agent can authenticate as each of the three roles and hit a trivial protected endpoint successfully; reference data exists and is queryable.

---

## Phase 2: Backend

**Goal:** Implement the orchestrator and all six agents against the schema defined in `database_design.md`, exposing the API surface defined in `api_specification.md`.

**Tasks:**
1. Implement the Issue entity and the canonical state machine enforcement logic in the orchestrator (state transition validation must live here, not be duplicated per-endpoint).
2. Implement the Reporter Agent integration: photo input → classification + severity output, wired to the chosen vision-capable model.
3. Implement the Validator Agent: deterministic geo+category candidate filtering, followed by similarity scoring; wire the confidence-threshold branching logic (auto-merge / prompt-confirm / unique) per Feature 2 business rules.
4. Implement the Router Agent: jurisdiction-mapping lookup (deterministic) + complaint-drafting (generative) two-step logic per Feature 3.
5. Implement the citizen-facing and authority-facing Issue endpoints (`POST /issues`, `POST /issues/{id}/confirm`, `GET /issues`, `GET /authority/issues`, `POST /authority/issues/{id}/status`, etc.) per `api_specification.md` Sections 3–4.
6. Implement the Escalation Agent as a scheduled job against SLA config and issue timestamps, including the grace-pause logic (BR-4.2) and idempotent re-run safety.
7. Implement the Verifier Agent: before/after photo comparison logic, confidence-threshold branching (`verified_resolved` / `inconclusive` / `disputed_resolution`) per Feature 5.
8. Implement the Notification Service as a subscriber to state-change events, with at minimum an in-app notification channel (per MVP scope; SMS/email can follow if time allows).
9. Implement the Agent Decision Audit Log writes from every agent invocation (Section 3.5 in `system_architecture.md`).
10. Implement Admin endpoints for SLA config and jurisdiction mapping CRUD.

**Dependencies:** Requires Phase 1 (auth, schema, reference data) complete. Tasks 2–4 can be built and tested in parallel by different developers/agents since each agent is an independent service per the architecture principle in `system_architecture.md` Section 1. Task 6 (Escalation) and the Predictor Agent groundwork (Phase 4) can also start in parallel once Task 1 (state machine) is stable, since both are scheduled/batch-oriented and don't block the synchronous citizen-reporting path.

**Exit criteria:** The full citizen-report-to-routed pipeline is exercisable via API calls alone (no frontend needed yet) for at least one demo issue, producing a correctly routed, AI-drafted complaint.

---

## Phase 3: Frontend

**Goal:** Build the three user-facing surfaces against the now-functional backend.

**Tasks:**
1. Build the Citizen App screens per `ui_ux_specification.md` Section 2, in this internal order: Home/Map → Report Capture → Classification Review → Confirmation/Status → My Reports → Onboarding (onboarding last, since it's the simplest screen and least load-bearing for demo risk).
2. Build the Authority Portal screens per Section 3, in this order: Login → Department Dashboard → Issue Detail/Action View → SLA Compliance View.
3. Build the shared components (Status Timeline, Status Badge, Map wrapper, Confidence Indicator) once, early, and reuse across surfaces rather than rebuilding per-surface — this is the single highest-leverage frontend task for consistency.
4. Wire real-time status updates (Firestore listeners or equivalent) into the Citizen App status views and Authority Portal dashboard so state changes appear live without manual refresh (critical for demo credibility per `ui_ux_specification.md` Section 8).
5. Build the minimal Admin Console screens needed for the Must-Have configuration capability (SLA Configuration, Jurisdiction Mapping) — full polish on Audit Log/User Management/Predictive Review screens is Should-Have and can slip to Phase 4/5 if needed.

**Dependencies:** Requires Phase 2 API endpoints to be functional, but UI shells/static layouts can begin in parallel with late Phase 2 work using mocked responses matching the `api_specification.md` payload shapes, then swapped to live calls once available.

**Exit criteria:** A citizen can complete the full reporting flow through the actual UI, and an authority user can see and act on that issue through the actual Authority Portal UI, with live status propagation visible end-to-end.

---

## Phase 4: AI/Advanced Features

**Goal:** Layer in the differentiating, higher-risk AI capabilities once the core lifecycle is solid.

**Tasks:**
1. Implement the Predictor Agent (heuristic/statistical version per `system_architecture.md` AI/ML Components table) against the seeded historical demo dataset; expose via the hotspot forecast endpoints.
2. Build the public hotspot map layer and the Admin Predictive Model Review screen.
3. Implement Community Impact Report generation (at minimum one manually-triggerable report per `mvp_scope.md` Should-Have framing) and the corresponding view/export screen.
4. Tune Verifier Agent prompting/logic for category-specific before/after expectations (per Feature 5 edge cases) using real captured demo photos to validate accuracy ahead of judging.
5. Tune Reporter Agent classification prompting against the actual demo photo set to hit the ≥85% category accuracy target in `product_requirements.md` Success Metrics.
6. If time allows: Hero Points/Leaderboard (Nice to Have), multi-channel notifications (Should Have).

**Dependencies:** Requires Phase 2 (backend/data pipeline) and ideally Phase 3 (so forecasts/reports have a UI to render into) substantially complete. This phase is explicitly where scope should flex down first if the team is behind schedule — Must Have items from Phases 1–3 take priority over any task in this phase.

**Exit criteria:** At least the Predictor Agent and one Impact Report are demoable; Reporter/Verifier accuracy has been validated against real captured demo data, not just synthetic test cases.

---

## Phase 5: Testing & Deployment

**Goal:** De-risk the live demo and deploy to a stable, judge-accessible environment.

**Tasks:**
1. **Scripted demo run-through:** Walk the entire lifecycle (report → validate → route → escalate-on-breach [using compressed demo SLA windows per `mvp_scope.md` Must Have item 4] → resolve → verify) at least twice end-to-end before judging, on the actual deployed environment, not just locally.
2. **Seed a clean, realistic demo dataset:** a small number of pre-existing issues in various states (some routed, some at-risk, some escalated, some verified-resolved) so the live demo doesn't have to build every state from zero in real time — judges should see a populated, living system, not an empty database.
3. **Edge case spot-checks:** Verify at minimum the high-priority error scenarios from `user_flows.md` Section 5 (upload failure retry, illegal state transition rejection, low-confidence classification flow) behave as specified.
4. **Access control verification:** Confirm an authority account genuinely cannot see/act on issues outside its department/jurisdiction scope (BR-8.2), and that admin-only endpoints reject non-admin tokens.
5. **Performance sanity check:** Confirm Reporter Agent response time and dashboard load time are within the NFR-1 targets under realistic demo conditions (not just on a fast local network).
6. **Deploy to the demo environment** (per `system_architecture.md` Section 7) and confirm all external service credentials (Maps Platform, LLM/vision provider, notification provider if used) are correctly configured in that environment, not just locally.
7. **Prepare the demo narrative:** align the live demo script with the quantified-impact and agentic-depth talking points in `solution_overview.md` Section 6 (Hackathon-Winning Factors), so the technical demo and the verbal pitch reinforce each other.

**Dependencies:** Requires Phases 1–4 (or as much of Phase 4 as time allowed) functionally complete. This phase should not be compressed to zero even under extreme time pressure — an untested live demo of an agentic system is a high-risk failure mode given the number of moving asynchronous parts (scheduled escalation, multi-step agent pipelines).

**Exit criteria:** A full, rehearsed, live demo has been successfully run at least once on the actual deployed environment without manual data manipulation mid-demo.

---

## Cross-Phase Dependency Summary

```
Phase 1 (Foundation)
   └──> Phase 2 (Backend)  ──┬──> Phase 3 (Frontend) ──> Phase 5 (Testing & Deployment)
                              └──> Phase 4 (AI/Advanced Features) ──┘
```

Phase 4 and Phase 3 can run partially in parallel once Phase 2's core endpoints are stable; Phase 5 requires both to have reached at least their Must-Have completion bar.
