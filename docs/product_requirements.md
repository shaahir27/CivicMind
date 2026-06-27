> **[ARCHIVE NOTICE: PLEASE READ]**
> This document was generated during the initial design phase of CivicSense (formerly CivicMind). As the project was actively developed, the architecture evolved into a robust TypeScript monorepo with dedicated packages (Landing Page, Admin Console, etc.) and replaced some proposed technologies (e.g., BigQuery, Cloud Scheduler) with Firebase and internal cron jobs. 
> 
> **For the current, live architecture and deployment instructions, please refer to the main [`README.md`](../README.md) at the root of the repository.**

---

# CivicMind — Product Requirements Document (PRD)

> Consistent with `solution_overview.md`. This document defines what must be built, not how. Implementation detail belongs in `system_architecture.md`, `database_design.md`, `api_specification.md`, and `feature_specifications.md`.

---

## 1. Functional Requirements

### FR-1: Citizen Issue Reporting
- FR-1.1: The system shall allow a citizen to submit an issue report consisting of at least one photo, a geolocation (GPS coordinates, captured automatically or selected manually on a map), and an optional free-text description.
- FR-1.2: The system shall allow a citizen to submit a report without creating an account first (guest reporting), but shall require a verified phone number or email to track status and receive escalation updates.
- FR-1.3: The system shall automatically classify the issue category (e.g., pothole, streetlight, garbage, water leakage, traffic signal, drainage, other) using the Reporter Agent based on the submitted photo.
- FR-1.4: The system shall automatically assign a severity score (Low / Medium / High / Critical) based on visual assessment.
- FR-1.5: The system shall allow the citizen to confirm or override the AI-assigned category before final submission.

### FR-2: Validation
- FR-2.1: The system shall run every new report through the Validator Agent to check for duplicates within a configurable geo-radius and time window.
- FR-2.2: The system shall merge duplicate reports into a single issue record while preserving a count of corroborating citizen reports.
- FR-2.3: The system shall flag reports with low AI-confidence or suspicious patterns (e.g., stock photo detection, mismatched geolocation) for either community corroboration or manual review before routing.
- FR-2.4: The system shall allow other citizens within the area to upvote/corroborate an existing issue rather than create a duplicate.

### FR-3: Routing
- FR-3.1: The system shall determine the correct owning department/authority for each validated issue using the Router Agent, based on issue category and jurisdiction/ward mapping.
- FR-3.2: The system shall auto-draft a formally worded complaint addressed to the identified department, including all relevant evidence (photo, location, description, severity).
- FR-3.3: The system shall deliver the drafted complaint to the authority via the Authority Portal (MVP) and, where configured, via email/API integration (post-MVP).
- FR-3.4: The system shall allow an authority user to view, accept, reassign, or reject the routing decision.

### FR-4: Tracking & Escalation
- FR-4.1: The system shall assign an SLA (service-level expectation) per issue category and severity (e.g., Critical water leakage: 48 hours; Low-severity garbage: 7 days), configurable by administrators.
- FR-4.2: The Escalation Agent shall monitor SLA timers continuously and autonomously escalate an issue to the next authority tier if the SLA is breached without status update.
- FR-4.3: The system shall notify the citizen of every status change (Submitted → Validated → Routed → In Progress → Resolved → Verified) and of every escalation event.
- FR-4.4: The system shall maintain a full, immutable audit trail of every state transition, including timestamps and the agent/user responsible.

### FR-5: Resolution Verification
- FR-5.1: The system shall require the responsible authority to submit an "after" photo of the same location when marking an issue as resolved.
- FR-5.2: The Verifier Agent shall perform an automated before/after visual comparison to assess whether genuine remediation occurred.
- FR-5.3: The system shall mark an issue as "Verified Resolved" only if the Verifier Agent's confidence exceeds a configurable threshold; otherwise it shall flag the issue as "Disputed Resolution" and notify the original reporter for confirmation.
- FR-5.4: The system shall allow the original reporter to manually dispute a "Verified Resolved" status within a configurable window, reopening the issue.

### FR-6: Predictive Intelligence
- FR-6.1: The Predictor Agent shall analyze historical resolved/unresolved issue data (category, location, season, recurrence) to generate hotspot forecasts.
- FR-6.2: The system shall display predicted hotspots on a map layer distinct from current active issues.
- FR-6.3: The system shall regenerate predictions on a scheduled cadence (configurable; default weekly) as new issue data accumulates.

### FR-7: Impact Reporting
- FR-7.1: The system shall automatically generate periodic (e.g., monthly) community impact reports per ward/area, including: number of issues reported, resolution rate, average resolution time, estimated cost/time savings, and a civic health score.
- FR-7.2: The system shall make impact reports viewable by citizens and authorities, and exportable (PDF/shareable link).

### FR-8: Authority Dashboard
- FR-8.1: The system shall provide authority users a dashboard listing all issues routed to their department, filterable by status, severity, and SLA risk.
- FR-8.2: The system shall allow authority users to update issue status and upload resolution evidence.
- FR-8.3: The system shall display SLA compliance metrics per authority/department.

### FR-9: Notifications
- FR-9.1: The system shall send notifications (push/SMS/email, configurable by channel availability) for: report received, validated, routed, status updates, escalation triggered, resolution submitted, verification result.

### FR-10: Gamification (Citizen Engagement)
- FR-10.1: The system shall award "hero points" to citizens for verified, non-duplicate, genuinely actionable reports.
- FR-10.2: The system shall display a leaderboard at the ward/area level (opt-in, privacy-respecting).

---

## 2. Non-Functional Requirements

### NFR-1: Performance
- Reporter Agent classification shall return a result within 5 seconds of photo upload under normal network conditions (P95).
- The Authority Portal dashboard shall load the active issue list (up to 500 items) within 3 seconds (P95).

### NFR-2: Scalability
- The system shall be designed to scale horizontally for ingestion (citizen reports) independently from the agent-processing pipeline, so report bursts (e.g., post-monsoon) do not block submission.
- The data layer shall support at minimum 100,000 issue records and 50,000 registered citizen users without redesign (hackathon-scale target; production scale is a roadmap item, see `mvp_scope.md`).

### NFR-3: Reliability & Availability
- Core citizen reporting flow shall degrade gracefully if any single agent is temporarily unavailable (e.g., report is accepted and queued for validation even if the Validator Agent is briefly down).
- Target availability for the citizen-facing app and authority portal: 99% during the demo/judging period; no formal SLA required pre-launch.

### NFR-4: Security & Privacy
- All citizen personally identifiable information (phone, email, exact home address if provided) shall be stored encrypted at rest and never displayed publicly without consent.
- Photo evidence shall be stored in access-controlled cloud storage; public-facing issue views shall only show photos relevant to the public infrastructure issue (not incidental personal data — see Validation Rules in `feature_specifications.md` for face/license-plate blurring as a Should-Have).
- Authority and admin accounts shall require authenticated, role-based access (citizen / authority / admin).

### NFR-5: Usability
- The citizen reporting flow shall be completable in 3 taps/steps or fewer after photo capture, optimized for low-literacy and low-bandwidth contexts (large touch targets, minimal text entry, voice-to-text description option as Should-Have).
- The system shall support at minimum English and one regional language (e.g., Tamil, given the Chennai/Indian market context) for citizen-facing UI strings.

### NFR-6: Auditability
- Every automated agent decision (classification, validation outcome, routing destination, escalation trigger, verification result) shall be logged with the agent's reasoning/confidence score, retrievable for dispute resolution and demo transparency.

### NFR-7: Maintainability
- Each agent shall be implemented as an independently invocable, independently testable unit, coordinated by the orchestrator, so individual agents can be modified or replaced without rewriting the full pipeline.

### NFR-8: Cost Efficiency
- AI/agent calls (vision, LLM reasoning) shall be batched or cached where possible (e.g., deduplication check before invoking a full classification call) to keep per-report inference cost bounded, given hackathon/demo budget constraints.

---

## 3. User Stories

### Citizen
- **US-1:** As a citizen, I want to report a civic issue by taking a photo so that I don't have to manually fill out a long form.
- **US-2:** As a citizen, I want to know which department my report was sent to so that I trust it's going to the right place.
- **US-3:** As a citizen, I want to be notified automatically if my report is ignored past a reasonable time so that I don't have to follow up myself.
- **US-4:** As a citizen, I want proof that an issue marked "resolved" was actually fixed so that I don't have to take the authority's word for it.
- **US-5:** As a citizen, I want to see issues near me that others have already reported so that I can corroborate instead of duplicating.
- **US-6:** As a citizen, I want to earn recognition for my reports so that I feel my civic participation is valued.

### Authority User
- **US-7:** As an authority user, I want to receive pre-validated, correctly routed complaints so that I don't waste time on duplicates or misrouted issues.
- **US-8:** As an authority user, I want a dashboard showing which issues are at risk of breaching SLA so that I can prioritize my team's work.
- **US-9:** As an authority user, I want to submit resolution evidence easily so that closing an issue is not extra administrative burden.

### Admin
- **US-10:** As an admin, I want to configure SLA thresholds per category/severity so that escalation behavior matches real municipal policy.
- **US-11:** As an admin, I want to view system-wide agent decision logs so that I can audit and tune agent behavior.
- **US-12:** As an admin, I want to generate ward-level impact reports so that I can communicate civic outcomes to stakeholders.

---

## 4. Acceptance Criteria

| User Story | Acceptance Criteria |
|---|---|
| US-1 | Given a citizen has captured a photo and location, when they submit, then a new issue record is created with status "Submitted" and an AI-suggested category/severity within 5 seconds. |
| US-2 | Given an issue has passed validation, when routing completes, then the citizen-facing status view displays the destination department name. |
| US-3 | Given an issue's SLA timer expires without a status update, when the Escalation Agent runs its check cycle, then the issue is automatically escalated and the citizen receives a notification within 1 hour of the breach being detected. |
| US-4 | Given an authority marks an issue "Resolved" with an after-photo, when the Verifier Agent completes its comparison, then the issue status becomes either "Verified Resolved" or "Disputed Resolution," never silently remains "Resolved" unverified. |
| US-5 | Given an existing unresolved issue within the configured geo-radius and time window, when a second citizen attempts to report a visually similar issue, then the system presents the existing issue for corroboration before allowing a new submission. |
| US-7 | Given an issue has been routed, when the authority opens their dashboard, then the issue appears with its AI-drafted formal complaint text pre-filled and editable. |
| US-10 | Given an admin updates an SLA threshold, when a new issue of that category/severity is created afterward, then it uses the updated threshold (existing in-flight issues retain their original threshold unless explicitly migrated). |

---

## 5. Success Metrics

### Demo/Hackathon-Stage Metrics (directly measurable in a demo)
- End-to-end lifecycle (report → validate → route → escalate-on-breach → verify) demonstrable for at least 3 distinct issue categories without manual intervention beyond the authority's own status updates.
- Classification accuracy (category) ≥ 85% on a curated demo dataset.
- Resolution verification agent correctly distinguishes a genuine before/after fix from a non-fix in a curated test set ≥ 80% of cases.
- Demo narrative quantifies impact (e.g., "reduced average resolution time from X to Y days," "estimated ₹Z saved") using either real seed data or clearly labeled illustrative projections.

### Post-Launch / Product Metrics (roadmap-stage, included for completeness)
- Citizen report-to-resolution median time, trending downward over time.
- Percentage of issues auto-escalated vs. resolved within original SLA.
- Percentage of "Resolved" statuses that pass verification on first submission (proxy for authority data-quality improvement over time).
- Repeat citizen reporting rate (engagement/trust proxy).
- Ward-level civic health score trend.

---

## 6. Constraints and Assumptions

### Constraints
- Development window is a hackathon timeframe (5–7 days); see `mvp_scope.md` for what is in/out of scope.
- AI/ML components are assumed to use Google's Gemini (Pro for reasoning/orchestration, Vision for image understanding) and Vertex AI (for pattern-based prediction), per the competitive/judging context described in `solution_overview.md`. If a different model provider is substituted, all references to "Gemini"/"Vertex AI" in this package should be treated as placeholders for "the chosen multimodal LLM" and "the chosen ML platform" respectively, with no change to functional behavior.
- No live integration with real municipal complaint systems is assumed for MVP; the Authority Portal is a CivicMind-native interface that simulates the authority side, with API-integration hooks documented as a roadmap item.
- Real department/jurisdiction mapping data (which ward maps to which authority) is assumed to be seeded as static reference data for the demo, not sourced from a live government API.

### Assumptions
- Citizens have smartphones with camera/file upload and GPS capabilities.
- At least basic connectivity is available at the point of reporting (offline queuing is a Should-Have, not assumed for MVP).
- A judge/demo audience will primarily evaluate the full lifecycle narrative and agent autonomy, not raw production-scale data volume.
- Authority-side users in the demo are simulated/seeded accounts rather than verified real-world government employees.
