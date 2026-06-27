# CivicMind — UI/UX Specification

> Describes screens, layout, components, navigation, and design principles across all three surfaces: Citizen App, Authority Portal, Admin Console. No code. Must remain consistent with screen lists in `system_architecture.md` Section 2 and flows in `user_flows.md`.

---

## 1. Design Principles

1. **Upload-first, not form-first.** The reporting flow is built around image upload, not a multi-field form. Text input is always optional, never the primary interaction.
2. **Status transparency over polish-for-polish's-sake.** Every screen showing an issue must make its current state and "what happens next" immediately legible — this is the product's core trust proposition.
3. **Low-literacy, low-bandwidth tolerant.** Large touch targets, icon + short-label pairing (not icon-only), minimal mandatory text entry, graceful degradation on slow networks (skeleton states, not blank screens).
4. **Authority-first efficiency on the portal side.** The Authority Portal favors information density and fast scanning (table/list-first) over the card-based, visually expansive style appropriate for the citizen app — these are different users with different goals and should not share a single visual paradigm even if they share a design system.
5. **Never let an automated decision look like a black box.** Anywhere an AI agent has made a classification, match, or verification decision, the UI must show the decision plus a confidence indicator and (where applicable) an override/dispute action.
6. **Color and status consistency.** A single, consistent color-to-status mapping is used across all three surfaces (e.g., neutral gray = submitted/validating, blue = routed/in_progress, amber = at-risk/escalated, green = verified_resolved, red = disputed_resolution) — this consistency matters more than any individual screen's aesthetic choice.

---

## 2. Citizen App — Screens

### 2.1 Onboarding / Explainer
- **Layout:** Full-screen, 2–3 swipeable panels, each with a single illustration, one headline, one short supporting line.
- **Components:** Progress dots, "Skip" link (top-right), "Continue"/"Get Started" primary button on final panel.
- **Navigation:** Linear, skippable at any point, leads to the Guest/Account choice screen.

### 2.2 Guest/Account Choice
- **Layout:** Centered, two large tappable cards: "Continue as Guest" and "Create Account."
- **Components:** Brief one-line explanation under each option clarifying the tracking-notification tradeoff.
- **Navigation:** Either path leads to Home.

### 2.3 Home / Map
- **Layout:** Map fills the majority of the viewport; a persistent, prominent floating action button ("Report an Issue") anchored bottom-center; a collapsible bottom sheet listing nearby issues as a scrollable list alternative to the map pins.
- **Components:** Map (Google Maps Platform component) with category-colored pins, filter chips (category, status) above the map, search/location bar, floating "Report an Issue" button, bottom navigation bar (Home / My Reports / Leaderboard / Profile).
- **Responsive behavior:** On narrow viewports, the bottom sheet defaults to a collapsed "peek" state showing only 1–2 list items plus a drag handle; on wider viewports (tablet), map and list can sit side-by-side rather than stacked.

### 2.4 Report Capture
- **Layout:** A drag-and-drop / tap-to-upload zone is the default state on entry.
- **Components:** Large upload target area, location confirmation chip (auto-shows resolved location, tappable to adjust on map if needed).
- **Navigation:** Capturing a photo (or selecting from gallery) advances directly to the Classification Review screen.

### 2.5 Classification Review
- **Layout:** Photo thumbnail at top, AI-suggested category and severity displayed as large, tappable chips below, confidence indicator (e.g., a small "AI confidence: high/medium/low" tag) next to each.
- **Components:** Category chip (tap to open category override picker), severity chip (tap to open severity override picker), optional description text field (collapsed by default, expandable), "Submit Report" primary button.
- **Edge case handling:** If confidence is low (per BR-1.1), the category chip is visually marked (e.g., outlined rather than filled) and the Submit button label changes to "Confirm & Submit" to make clear citizen confirmation is required, not optional.

### 2.6 Duplicate Candidate Confirmation (conditional screen)
- **Layout:** Side-by-side or stacked comparison: the candidate existing issue's photo/summary vs. the citizen's just-captured photo.
- **Components:** "Yes, same issue" / "No, different issue" two-button choice, clearly worded to avoid ambiguity.
- **Navigation:** Either choice proceeds to the Confirmation/Status screen, with messaging tailored to the outcome.

### 2.7 Report Confirmation / Status
- **Layout:** Single-column summary: status badge, department name (once routed), a simple horizontal/vertical timeline showing the lifecycle stages with the current stage highlighted.
- **Components:** Status timeline component (reused across Citizen App and, in adapted form, the Authority Portal issue detail view), "Share" action (optional, Nice-to-Have, for social proof), "Back to Home" button. Features a gracefully degrading image block (if the photo fails to load, it displays a visually pleasing, category-specific icon graphic rather than a broken image or generic pin).

### 2.8 My Reports
- **Layout:** Scrollable list, each row showing photo thumbnail, category icon, status badge, and time-since-submitted.
- **Components:** Filter/sort control (by status), list rows, empty-state illustration ("You haven't reported anything yet — tap the camera to get started") for first-time users.
- **Navigation:** Tapping a row opens that issue's full Status/Timeline view (same component as 2.7, with added detail: full photo, description, status history).

### 2.9 Notifications
- **Layout:** Standard reverse-chronological notification feed.
- **Components:** Notification list item (icon by type — escalation/resolution/verification — short text, timestamp), tap-through to the relevant issue.

### 2.10 Leaderboard (Nice to Have)
- **Layout:** Ranked list, ward-scoped by default with a toggle for city-wide.
- **Components:** Rank, display name (or "Anonymous Citizen" if not opted into public display), point total, opt-out toggle in Profile settings (not on this screen itself, to avoid clutter).

### 2.11 Profile
- **Layout:** Simple settings list.
- **Components:** Contact info (editable if registered, "Create Account" prompt if guest), language selector, notification preferences, leaderboard visibility toggle, logout.

---

## 3. Authority Portal — Screens

### 3.1 Login
- **Layout:** Centered, minimal credentialed login form (email + password); no public sign-up (accounts are admin-provisioned per `user_flows.md` Admin Workflow step 6).

### 3.2 Department Dashboard (Issue Queue)
- **Layout:** Dense table/list view, not card-based — optimized for scanning many issues quickly. Default sort: At-Risk and Escalated issues pinned to top.
- **Components:** Filter bar (status, severity, SLA-risk), sortable columns (category, severity, time remaining/overdue, corroboration count), row-level quick-status badges, search by issue ID/location.
- **Responsive behavior:** Table view on desktop; collapses to a card-per-row list on tablet/mobile width without losing any filter functionality (authority staff may occasionally check the portal from a phone in the field).

### 3.3 Issue Detail / Action View
- **Layout:** Two-column on desktop: left column = photo(s), location map pin, AI-drafted complaint text (editable text area); right column = status control, status history timeline, corroboration list, reassign action.
- **Components:** Status action buttons (contextual — only legal next-states per the canonical state machine are shown, per design principle 5/6 and BR-8.2 enforcement), after-photo upload control (only appears/required when transitioning to `resolved`), "Reassign Department" action with reason field.
- **Edge case handling:** If an after-photo upload is attempted without GPS/location metadata matching the issue location closely enough, an inline warning appears before submission rather than a silent backend rejection (supports BR validation in Feature 5 with good UX, not just a hard error).

### 3.4 SLA Compliance View
- **Layout:** Dashboard-style summary with key metric tiles (on-time resolution %, average resolution time, current at-risk count) plus a trend chart over time.
- **Components:** Metric tiles, trend line chart, breakdown table by category.

### 3.5 Impact Report View (read-only for authority)
- **Layout:** Report card per period, matching the public-facing impact report structure but with additional department-specific breakdown.

---

## 4. Admin Console — Screens

### 4.1 SLA Configuration
- **Layout:** Editable table, rows = category × severity combinations, columns = current SLA hours, last updated, updated by.
- **Components:** Inline edit on cell tap, save confirmation toast.

### 4.2 Jurisdiction Mapping
- **Layout:** Editable table, rows = ward/area × category, columns = assigned department, fallback flag.
- **Components:** Inline edit, "Add Mapping" action, conflict warning if a mapping for the same (ward, category) already exists (supporting the unique-constraint validation in `database_design.md`).

### 4.3 Agent Decision Audit Log
- **Layout:** Filterable, paginated log table (agent type, issue ID link, confidence, timestamp), expandable row to view full input/output summary.
- **Components:** Filter bar (agent type, date range, issue ID search), expandable row detail.

### 4.4 User & Role Management
- **Layout:** User table (name/email, role, department/jurisdiction scope), "Invite User" action opening a form modal.
- **Components:** Role/department/jurisdiction selectors in the invite modal, status indicator (pending invite / active).

### 4.5 Predictive Model Review
- **Layout:** Map view (admin-only full forecast layer, including suppressed low-confidence forecasts) plus a list view with confidence values and a manual "Suppress from public view" toggle per forecast.

### 4.6 Impact Report Generation
- **Layout:** Form (ward/area selector, period selector) plus a list of previously generated reports with export links.

---

## 5. Shared Components

| Component | Used In | Notes |
|---|---|---|
| Status Timeline | Citizen App (2.7, 2.8), Authority Portal (3.3) | Single canonical visual representation of the state machine defined in `user_flows.md`; must never diverge in step ordering between surfaces |
| Status Badge | All three surfaces | Color mapping per design principle 6 |
| Map (Google Maps Platform wrapper) | Citizen Home, Authority jurisdiction view, Admin Predictive Review, public hotspot map | Single shared component configured differently per context (pin set, interactivity, overlay layers) rather than separately built per surface |
| Confidence Indicator | Citizen Classification Review, Authority Issue Detail, Admin Audit Log | Consistent visual language (e.g., a 3-level dot/bar indicator) regardless of which agent's confidence is being shown |
| Photo Upload/Capture Control | Citizen Report Capture, Authority after-photo upload | Shared validation logic (file size/type) even though the surrounding UI context differs |

---

## 6. Navigation Structure

**Citizen App:** Bottom tab navigation — Home, My Reports, Leaderboard (if enabled), Profile. Report Capture is reached via a floating action button from Home, not a tab (it is an action, not a destination).

**Authority Portal:** Left sidebar navigation — Dashboard, SLA Compliance, Impact Reports, (Settings/Profile at bottom of sidebar). Issue Detail is a drill-down from Dashboard, not a top-level nav item.

**Admin Console:** Left sidebar navigation — SLA Configuration, Jurisdiction Mapping, Audit Log, User Management, Predictive Review, Impact Reports.

---

## 7. Responsive Behavior Summary

| Surface | Primary target | Secondary target | Behavior notes |
|---|---|---|---|
| Citizen App | Mobile (portrait) | Tablet | Bottom sheet/map layout adapts per 2.3; otherwise mobile-first throughout |
| Authority Portal | Desktop | Tablet (field use) | Table collapses to stacked cards below a defined breakpoint; sidebar collapses to a hamburger/drawer on narrow viewports |
| Admin Console | Desktop only | — | Not optimized for mobile; acceptable to show a "best viewed on desktop" notice if accessed on a phone, since admin tasks are inherently low-frequency/back-office |

---

## 8. User Experience Considerations

- **Trust signals over decoration:** Every screen that shows an AI-driven outcome (classification, duplicate match, verification result) should surface *why* in plain language (e.g., "Matched because it's 12 meters from an existing pothole report"), not just a bare confidence number — this is both good UX and a strong hackathon-demo narrative device.
- **No dead ends:** Every error state (see `user_flows.md` Section 5) must present a clear next action, never just an error message with no path forward.
- **Demo-readiness consideration:** Given this product will likely be judged live, status transitions (especially escalation and verification) should be visually satisfying and immediate in the demo environment — avoid UI patterns that require a page reload to reflect a backend-driven state change, since the orchestrator/agent actions are the core value proposition being demonstrated.
- **Accessibility baseline:** Sufficient color contrast for status badges (do not rely on color alone — pair with icon/text label), minimum tappable target size of 44x44px on citizen-facing mobile screens, alt text on all icon-only buttons.
