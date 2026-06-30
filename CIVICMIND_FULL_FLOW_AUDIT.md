# CivicMind — Full End-to-End Flow Audit

> **Purpose:** This is NOT a file-existence check. Do not just verify that files/routes/screens exist. Your job is to **trace and validate the actual behavior** of all three applications (Citizen App, Authority Portal, Admin Console) as a real user would experience them — click by click, API call by API call, state transition by state transition — and report every place where the real behavior diverges from what is documented, what is broken, what is inconsistent, or what is incomplete.

Act as a senior QA engineer + systems auditor. Read the code as if you were about to demo this live in front of judges and cannot afford a single surprise.

---

## How to Conduct This Audit

For each flow below:
1. Open the relevant screen component(s) and read them top to bottom.
2. Trace every API call the screen makes — find the matching route handler in `packages/backend/src/routes/`.
3. Trace what the route handler actually does — which orchestrator function it calls, which Firestore collections it reads/writes, which agent (if any) it invokes.
4. Confirm the response shape returned by the backend matches what the frontend expects to receive (field names, types, nullability).
5. Check what happens on every error path — not just the happy path. What does the UI show if the API returns a 4xx/5xx? Is there a loading state, an empty state, a retry mechanism?
6. Check state machine legality — can the user trigger an action from a screen that the backend would reject because the issue is in the wrong status? If so, does the UI prevent it, or does it let the user click and then show a confusing error?
7. Check role boundaries — try to find any screen, button, or API call that a citizen could exploit to act like an authority, or an authority could exploit to act like an admin, or to act outside their jurisdiction/department scope.
8. Check for race conditions / double-submission risks (e.g., double-clicking "Resolve", double-clicking "Submit Report").

---

## Flow 1 — Citizen: First-Time Onboarding to First Report

Trace this exact sequence:
1. `OnboardingScreen` → what triggers navigation away from it? Is there a "skip" path?
2. `AuthScreen` → all three auth paths (guest session, OTP, Google sync). For each: what does the backend return, what gets stored client-side (token, user object), and where does the user land next?
3. `ProfileSetupScreen` → is this mandatory or skippable? What happens if a guest user skips it and later tries to do something that needs a display name?
4. `HomeScreen` → initial load: what API calls fire on mount? What happens if the user denies location permission? What happens if `seed-near-me` data and real backend data overlap or conflict?
5. `ReportCaptureScreen` → trace the full photo → location → description → submit pipeline. What happens if the photo upload fails partway? What happens if GPS fails and the user is in `isManualFallback` mode — does manual category/severity selection actually bypass the Reporter Agent entirely, and if so, is that intentional or a backdoor around AI classification?
6. `ClassificationReviewScreen` → confirm the confidence-threshold branch (does the screen actually check confidence and skip itself when confidence is high, or does it always show?).
7. `DuplicateCandidateScreen` → confirm both branches of `handleDecision` (is_same_issue = true / false) hit the correct backend endpoint and lead to the correct next screen.
8. `ConfirmationStatusScreen` → confirm it correctly reflects whatever status the issue is actually in (submitted/routed/duplicate_candidate/etc.) rather than assuming a single fixed status.
9. `MyReportsScreen` → confirm the citizen can only ever see their own issues, never another citizen's.

**Report:** a step-by-step diagram (or table) of this flow as it ACTUALLY behaves in code, flagging every divergence from the "happy path" described in the demo script, and every dead end, broken navigation, or missing error state you find.

---

## Flow 2 — Citizen: Disputing a Resolution

1. From `MyReportsScreen` or `ConfirmationStatusScreen`, is there an actual UI entry point (button) that calls `POST /issues/:id/dispute-resolution`? Or does this endpoint exist in the backend with no frontend wired to it at all?
2. If there is no UI for it, flag this clearly — a backend capability with no citizen-facing trigger is effectively dead code from a user's perspective.
3. If there is a UI for it, trace what happens to the issue and what the citizen sees afterward (does `MyReportsScreen` correctly show the re-opened status?).

---

## Flow 3 — Authority: Login to Resolution

1. `LoginScreen` (authority-portal) → trace `handleLogin` and `handleDemoLogin`. Confirm what claims/role get attached to the session token and whether `jurisdictionScope` is correctly read from the token vs. fetched separately.
2. `DashboardScreen` → confirm the issue list shown is genuinely scoped server-side (re-verify by reading `GET /authority/issues` again with fresh eyes) and not just filtered client-side (which would be a security flaw if true).
3. Confirm the SLA countdown displayed on each card is computed from `time_remaining_seconds` returned by the backend and updates correctly, not just a static label.
4. `IssueDetailScreen` → trace `handleUpdateStatus` for both `in_progress` and `resolved`. For `resolved`, confirm the UI genuinely blocks submission without a photo (`handleFile`) rather than just showing a warning that can be bypassed.
5. After resolution, confirm the screen correctly reflects whichever of `verified_resolved` / `inconclusive` / `disputed_resolution` the Verifier Agent actually returns — does the UI handle all three outcomes distinctly, or does it just assume success?
6. Confirm `SlaComplianceScreen` — does it call any backend endpoint at all? If not, confirm this explicitly and report it as a non-functional/placeholder screen.
7. Confirm the reassign flow (`POST /authority/issues/:id/reassign`) — is there an actual UI for this anywhere in `authority-portal`, or does it only exist as a backend route?

---

## Flow 4 — Admin: Full Console Walkthrough

For EACH of the 6 admin screens, answer:
- What API calls fire on mount?
- What happens on save/update — is there optimistic UI update, and if the backend call fails, does the UI correctly roll back?
- Is there pagination, and does it actually work past the first page if more than `limit` records exist?

Specifically:
1. `AuditLogScreen` → confirm filters (agent_type, issue_id, date range) actually apply server-side and aren't just decorative.
2. `ImpactReportsScreen` → confirm `handleGenerate` correctly surfaces the `INSUFFICIENT_DATA` 422 error from the backend (minimum 3 issues) in a user-friendly way, not a raw error dump.
3. `JurisdictionScreen` → confirm editing a mapping and saving it actually persists and is reflected if you refresh the page.
4. `PredictiveReviewScreen` → confirm `handleRunCycle` correctly calls the internal endpoint with the internal secret header, and confirm explicitly whether `handleToggleVisibility` is wired to a real backend call or is a local-only `setTimeout` simulation (verify against current code, this was a stub as of the last check — confirm if still true).
5. `SlaConfigScreen` → confirm changing an SLA value here actually changes the deadline calculation for NEW issues filed after the change (and confirm it correctly does NOT retroactively change deadlines for already-routed issues, unless that is the intended behavior — check the orchestrator logic).
6. `UserManagementScreen` → confirm the invite flow creates a real Firebase Auth user with custom claims, and confirm whether there is any actual email/invite delivery mechanism or if `invite_sent: true` in the response is purely cosmetic (verify against the route code — it was noted as "conceptual" at last check).

---

## Flow 5 — Cross-Cutting Concerns

1. **Notifications:** Trace `notificationService.ts` — at which exact state transitions is a notification actually created? Confirm citizens and authorities each see notifications relevant to them, and confirm there's a UI surface that displays them (or if notifications are written to Firestore but never rendered anywhere — a "write-only" notification system would be a real finding).
2. **Real-time updates:** Confirm which screens use Firestore real-time listeners (`onSnapshot`) vs. one-time `fetch()` calls. Flag any screen that claims to be "live" in the docs but is actually a static fetch that requires a manual refresh.
3. **Idempotency:** Confirm `idempotency_key` on issue submission is actually checked server-side to prevent duplicate submissions from a flaky network retry, or if it's accepted but never validated against existing records.
4. **Rate limiting:** Confirm `strictRateLimit` / `standardRateLimit` are actually applied to the routes they're declared on, and that the limits are sane for demo purposes (won't accidentally throttle a live demo).
5. **i18n completeness:** For each of the 7 locale files, confirm there are no missing keys relative to `en.json` that would cause a blank string or raw key to render in the UI.
6. **Multi-tab / concurrent session behavior:** What happens if the same citizen has the app open in two tabs and submits a report in one — does the other tab's `MyReportsScreen` update live or go stale?

---

## Final Deliverable

Produce a single structured audit report with these sections:

1. **Flow Diagrams** — for each of Flows 1–4, a clear sequential diagram (screen → API call → backend logic → next screen) reflecting ACTUAL behavior, not intended behavior.
2. **Broken / Incomplete Findings** — a table: `Issue | Location (file:line) | Severity (Blocker/Major/Minor) | Recommendation`.
3. **Dead Code / Orphaned Features** — backend capabilities with no frontend trigger, or frontend buttons calling non-existent/stubbed endpoints.
4. **Security/Scope Findings** — any place RBAC or jurisdiction scoping could theoretically be bypassed from the client side.
5. **State Machine Violations** — any UI path that could request an illegal status transition, and how the backend currently handles that (gracefully rejects vs. crashes vs. silently no-ops).
6. **Overall Verdict** — is this safe to demo live end-to-end today, or are there flows you'd specifically avoid clicking in front of an audience?
