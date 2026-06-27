> **[ARCHIVE NOTICE: PLEASE READ]**
> This document was generated during the initial design phase of CivicSense (formerly CivicMind). As the project was actively developed, the architecture evolved into a robust TypeScript monorepo with dedicated packages (Landing Page, Admin Console, etc.) and replaced some proposed technologies (e.g., BigQuery, Cloud Scheduler) with Firebase and internal cron jobs. 
> 
> **For the current, live architecture and deployment instructions, please refer to the main [`README.md`](../README.md) at the root of the repository.**

---

# CivicMind — User Flows

> All flows below must remain consistent with the issue status state machine defined here, which is the canonical reference for `feature_specifications.md`, `api_specification.md`, and `database_design.md`.

## Canonical Issue Status State Machine

```
submitted → validating → (duplicate_candidate | unique)
unique → routing → routed
routed → in_progress → resolved → verifying → (verified_resolved | disputed_resolution | inconclusive)
disputed_resolution → routed (reopened)
inconclusive → verified_resolved (after dispute-window timeout, no action)
verified_resolved → [closed] (or reopened if citizen disputes within window)
any of [routed, in_progress] → escalated → routed (reassigned to next tier)
[final escalation tier] + breach → publicly_escalated
```

Status values used throughout: `submitted`, `validating`, `duplicate_candidate`, `routed`, `in_progress`, `escalated`, `publicly_escalated`, `resolved`, `verifying`, `verified_resolved`, `disputed_resolution`, `inconclusive`, `closed`.

---

## 1. Citizen Onboarding Flow

**Goal:** Get a first-time citizen from app open to capable of submitting a report, with minimal friction.

1. Citizen opens the app/web app for the first time.
2. App requests location permission ("To show issues near you and tag your reports accurately").
   - If granted → proceed with auto-location enabled.
   - If denied → proceed; manual map pin-drop will be used at report time.
3. App presents a 2–3 screen lightweight explainer (skippable): "Report in seconds → We route it to the right department → We make sure it's actually fixed."
4. Citizen is offered the choice: **"Continue as Guest"** or **"Create Account"** (phone/email + OTP or magic link).
   - Guest: can submit reports immediately; no tracking/notifications; can upgrade to an account later by claiming prior anonymous reports via a recovery code shown after each anonymous submission.
   - Account: phone or email entered, OTP/verification code sent, citizen enters code, account created.
5. Citizen lands on the Home/Map screen showing nearby reported issues and a prominent "Report an Issue" action.

**Exit condition:** Citizen reaches the Home screen, either as Guest or as an authenticated account holder.

---

## 2. Core Workflow — Citizen Reports an Issue (End-to-End)

1. Citizen taps "Report an Issue" from Home.
2. App presents a simple, modern file upload zone — citizen drags and drops a photo or taps to upload an image from their device.
3. App auto-captures GPS location in the background if permitted, or infers it based on the image EXIF data.
   - If GPS unavailable: app prompts "Confirm location on map" with a pin defaulted to last-known location, citizen adjusts if needed.
4. App sends photo + location to the Reporter Agent (via orchestrator).
5. Within ~5 seconds, app displays: suggested category, suggested severity, and a confidence indicator.
   - Citizen taps "Confirm" if correct, or taps the category chip to override.
6. App shows an optional text field: "Add details (optional)" — citizen may add a short description or skip.
7. Citizen taps "Submit Report."
8. System creates the Issue record (`status: submitted`) and immediately triggers the Validator Agent.
9. **Validation branch:**
   - If a high-confidence duplicate is found (≥0.8): citizen sees "Good news — this is already being tracked! Your report has been added as confirmation." Issue becomes a corroboration on the existing record; flow ends here for this citizen.
   - If a medium-confidence candidate is found (0.5–0.8): citizen is shown the candidate ("Is this the same issue?") with Yes/No.
     - Yes → merged as corroboration.
     - No → proceeds as a new unique issue.
   - If unique (no match): proceeds directly.
10. System triggers the Router Agent: identifies department, drafts formal complaint, issue status becomes `routed`.
11. Citizen sees confirmation screen: "Reported to [Department Name]. We'll track this and follow up automatically." Status timeline begins.
12. Citizen receives a notification at every subsequent state change (in progress, escalated, resolved, verification result) without needing to reopen the app.
13. Citizen can return anytime to "My Reports" to see the live status timeline of this issue.

**Exit condition:** Issue reaches a terminal state (`verified_resolved` / `closed`) or remains actively tracked indefinitely until resolved.

---

## 3. Core Workflow — Authority Resolves an Issue

1. Authority user logs into the Authority Portal (role: `authority`, scoped to their department/jurisdiction).
2. Dashboard shows the issue queue, sorted by default with "At Risk" (near SLA breach) and `escalated` issues surfaced first.
3. Authority opens an issue detail view: sees photo, AI-drafted formal complaint text, location, severity, corroboration count, and full history.
4. Authority updates status to `in_progress` (optional intermediate step) — citizen is notified.
5. Once physical work is completed, authority opens the issue and selects "Mark Resolved."
6. System requires an after-photo upload before the status change is accepted.
   - If no photo provided: submission blocked with inline message "An after-photo is required to verify resolution."
7. Authority submits the after-photo; status becomes `resolved` → `verifying` (automatic, no separate authority action required).
8. Verifier Agent runs the before/after comparison.
9. **Verification branch:**
   - High confidence match → status `verified_resolved`. Authority dashboard shows a green "Verified" badge against this issue. Citizen notified with confirmation and a thank-you/closure message.
   - Inconclusive → citizen is prompted to confirm manually within the dispute window; authority dashboard shows "Pending Citizen Confirmation."
   - Low confidence / clear mismatch → status `disputed_resolution`, issue automatically reopens and routes back to the same authority with a flag; authority is notified that resolution evidence was rejected and must resubmit.

**Exit condition:** Issue reaches `verified_resolved` (success path) or returns to step 4 after a disputed resolution (retry loop).

---

## 4. Escalation Flow (System-Triggered, No Human Initiation Required)

1. Escalation Agent runs on its scheduled cycle (default hourly).
2. For each issue in `routed` or `in_progress` status, the agent checks elapsed time against the assigned SLA (adjusted for any valid `in_progress` grace pause).
3. If SLA is breached:
   a. Issue status becomes `escalated`.
   b. Issue is reassigned to the next-tier authority (per escalation tier mapping).
   c. Both the prior and new responsible authority receive a notification.
   d. The citizen receives a notification: "Your report has been escalated to [Next Tier] because it wasn't addressed in time."
4. If the next tier is also breached and no further tier exists:
   a. Issue status becomes `publicly_escalated`.
   b. Issue is surfaced on a public "Unresolved & Escalated" view, visible to all citizens and admins, with full timeline transparency.
5. Cycle repeats; idempotency ensured so the same breach event never triggers a duplicate escalation.

**Exit condition:** Authority updates status before the next breach check, halting further escalation for that tier; or issue reaches final-tier public escalation.

---

## 5. Error Scenarios

### 5.1 Photo Upload Fails Mid-Submission
- App detects upload failure (network drop).
- Draft report (photo + location + any entered text) is retained locally.
- App shows "Couldn't submit — we'll retry automatically" with a manual "Retry Now" option.
- On success, normal flow resumes from step 7 of the Core Workflow (no duplicate record created; idempotency key tied to the local draft prevents double-submission if both auto-retry and manual retry fire).

### 5.2 Location Outside Supported Service Area
- Citizen attempts to submit a report with a resolved location outside the configured city/ward bounding box.
- App blocks submission at the client level with: "CivicMind isn't available in this area yet."
- No Issue record is created.

### 5.3 AI Classification Low Confidence on All Categories
- Reporter Agent returns no category above the confidence threshold.
- App defaults the category to `other`, clearly marks it "Unclassified — please review," and still requires citizen confirmation before submission proceeds (cannot silently submit as "other" without citizen awareness).

### 5.4 Authority Attempts Illegal Status Transition
- Authority tries to set `resolved` directly from `submitted` (e.g., via a bug or stale UI state).
- API layer rejects the transition with a clear error referencing the canonical state machine; UI surfaces "This action isn't available for the current status."

### 5.5 Verifier Agent Cannot Reach a Confident Decision Due to Poor Image Quality
- Both before/after images are present but quality (blur, darkness) prevents reliable comparison.
- Result defaults to `inconclusive` rather than `disputed_resolution`.
- Authority is prompted: "We couldn't clearly verify this — please upload a clearer after-photo," giving a path to retry without unfair penalty.

### 5.6 Citizen Disputes a Verified Resolution
- Within the dispute window, citizen taps "This isn't actually fixed" on a `verified_resolved` issue.
- Issue reopens to `disputed_resolution` → routes back to the responsible authority.
- This event is logged distinctly from agent-detected disputes (citizen-initiated vs. AI-initiated) for accountability/impact-report accuracy.

### 5.7 SLA Configuration Missing for a Category/Severity Combination
- Admin has not configured an SLA for a newly introduced category.
- System applies a system-wide default SLA (configurable, e.g., 7 days) and flags the issue internally as "using default SLA" so admins can identify gaps in configuration.

### 5.8 Invalid Civic Issue Image Rejection
- Citizen uploads a photo of a random object (e.g., a person, animal, or indoor setting) instead of a civic infrastructure issue.
- The Reporter Agent detects that the image is not a civic issue (`is_civic_issue: false`).
- API layer intercepts this and aborts submission, returning a `400 INVALID_CIVIC_ISSUE` error.
- App stops the submission flow immediately and displays an inline error: "This image does not appear to be a valid civic issue. Please upload a relevant photo." No database record is created.

---

## 6. Admin Workflow

1. Admin logs into the Admin Console (role: `admin`).
2. **SLA Configuration:** Admin navigates to SLA settings, sets/edits thresholds per category × severity, and sets escalation tier mappings (which role/authority is Tier 2, Tier 3, etc.) per department.
3. **Jurisdiction Mapping:** Admin maintains the ward/jurisdiction → department mapping table (add/edit/remove entries); changes take effect for newly routed issues immediately.
4. **Agent Decision Audit:** Admin opens the audit log view, filters by agent type (Reporter/Validator/Router/Escalation/Verifier/Predictor), and inspects individual decision records (input summary, output, confidence, timestamp) for dispute resolution or tuning.
5. **Impact Report Generation:** Admin triggers (or reviews the scheduled auto-generation of) ward-level impact reports; can export as PDF/shareable link.
6. **User & Role Management:** Admin creates/edits authority accounts and assigns department/jurisdiction scope.
7. **Predictive Model Review:** Admin views current hotspot forecasts, confidence thresholds, and can manually suppress a forecast from public view if it appears unreliable for a given area.

**Exit condition:** Admin actions persist immediately and affect only newly created/processed issues going forward, never silently rewriting historical records (preserving auditability per NFR-6).
