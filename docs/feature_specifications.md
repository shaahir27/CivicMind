# CivicMind — Feature Specifications

> Each feature below maps to one or more functional requirements in `product_requirements.md` and to one agent in the architecture defined in `system_architecture.md`. Priorities use MoSCoW (Must Have / Should Have / Nice to Have) and are reconciled with `mvp_scope.md` — if a conflict is found, `mvp_scope.md` is authoritative for scope, this document is authoritative for behavioral detail.

---

## Feature 1: Citizen Issue Reporting (Reporter Agent)

**Priority:** Must Have

**Purpose:** Allow a citizen to report a civic issue with minimal friction, using a photo as the primary input rather than manual form-filling.

**User Value:** Reduces reporting time to under 30 seconds; removes the need for citizens to know taxonomy/category terminology.

**Inputs:**
- Required: at least 1 photo (JPEG/PNG/HEIC, max 10MB per image, up to 3 images)
- Required: geolocation (device GPS automatically captured, or manual pin-drop on map if GPS unavailable/denied)
- Optional: free-text description (max 500 characters)
- Optional: citizen contact identifier (phone or email) — required only if the citizen wants tracking/notifications; anonymous submission allowed with no tracking

**Outputs:**
- A boolean flag `is_civic_issue` determining if the image is valid
- A new Issue record with status `submitted` (if valid)
- AI-suggested category (enum: `pothole`, `streetlight`, `garbage`, `water_leakage`, `traffic_signal`, `drainage`, `road_damage`, `other`)
- AI-suggested severity (enum: `low`, `medium`, `high`, `critical`)
- Confidence score (0.0–1.0) for both category and severity

**Business Rules:**
- BR-1.0: If `is_civic_issue` evaluates to false, the system immediately rejects the submission and returns a 400 error. The record is not saved.
- BR-1.1: If AI category confidence < 0.6, the citizen must manually confirm or select the category before submission completes.
- BR-1.2: Severity `critical` (e.g., exposed live wire, major water main burst, structural collapse risk) shall trigger an immediate high-priority notification path regardless of subsequent agent processing time.
- BR-1.3: A report cannot be submitted without at least one photo and a resolved geolocation (automatic or manual).
- BR-1.4: Anonymous reports (no contact identifier) cannot receive status notifications but still flow through the full agent pipeline and appear on public maps.

**Validation Rules:**
- Photo file type and size validated client-side before upload (reject >10MB, reject non-image MIME types).
- Geolocation must resolve to a coordinate pair within the supported service area (configurable bounding box per deployment/city); reports outside the bounding box are rejected with a clear message at submission time, not silently dropped.
- Free-text description, if provided, is sanitized against script injection given it may be displayed in dashboards and exported reports.

**Edge Cases:**
- GPS denied/unavailable: fallback to manual map pin; if no location provided at all, block submission.
- Poor network mid-upload: client retains the draft locally and retries; submission is not duplicated if retried.
- Photo of unrelated subject (e.g., a selfie): Reporter Agent confidence will be low across all categories; routed to `other` with a confidence flag for human/community review rather than auto-rejected (avoids penalizing legitimate edge-case issues that don't fit a predefined category).
- Multiple issues visible in one photo (e.g., pothole + broken streetlight in frame): Reporter Agent selects the dominant/largest issue and surfaces the secondary detection as a suggested second report rather than conflating both into one record.

---

## Feature 2: Duplicate Detection & Community Validation (Validator Agent)

**Priority:** Must Have

**Purpose:** Prevent duplicate reports of the same physical issue from creating redundant work, and add a trust signal before authority routing.

**User Value:** Citizens see that their issue is already known/being tracked rather than feeling ignored when a near-identical report already exists; authorities are not flooded with N reports of the same pothole.

**Inputs:**
- New issue record (post Reporter Agent classification)
- Geo-radius and time-window configuration (default: 50 meters, 30 days, configurable per category — e.g., garbage overflow may use a shorter time window than a pothole)
- Existing open/in-progress issues in the same area and category

**Outputs:**
- Validation result: `unique` (proceeds to routing) or `duplicate_candidate` (linked to existing issue, or presented to citizen for corroboration confirmation)
- Updated corroboration count on the canonical issue if merged
- Confidence score for the duplicate match

**Business Rules:**
- BR-2.1: A duplicate match requires both proximity (within configured radius) and category match; visual similarity is a supporting signal, not a sole determinant.
- BR-2.2: If a duplicate candidate is found with confidence ≥ 0.8, the new report is auto-merged as a corroboration without requiring citizen confirmation.
- BR-2.3: If confidence is between 0.5–0.8, the citizen is shown the candidate match and asked to confirm "same issue" or "different issue" before the system finalizes the decision.
- BR-2.4: Corroboration count contributes to severity re-scoring — an issue corroborated by 5+ independent citizens may have its severity escalated even if the original AI severity score was lower.

**Validation Rules:**
- Geo-radius matching uses geodesic distance, not simple lat/long delta.
- Time window excludes already-resolved-and-verified issues from duplicate matching (a new report near a verified-fixed location is treated as a new issue, not a duplicate, since the prior problem was confirmed solved).

**Edge Cases:**
- Two genuinely separate issues of the same category very close together (e.g., two distinct potholes 10 meters apart): radius threshold tuned conservatively per category to minimize false merges; manual "split" action available to authority/admin if a wrongful merge is identified.
- Citizen disputes a "different issue" classification: report proceeds as a new, independent issue; no penalty applied to the citizen.
- High-confidence duplicate candidate but submitted by the *same* citizen who filed the original: still merged as corroboration, but flagged internally so hero points are not double-awarded to the same user for the same physical issue.

---

## Feature 3: Intelligent Routing & Complaint Drafting (Router Agent)

**Priority:** Must Have

**Purpose:** Identify the correct owning authority/department for a validated issue and produce a formally worded complaint, removing the citizen's burden of knowing civic bureaucracy.

**User Value:** Citizens no longer need to know whether a streetlight issue belongs to the electricity board or the municipal corporation; the system handles it and produces complaint language that reads as credible and specific to authorities.

**Inputs:**
- Validated issue record (category, severity, location, description, photo, corroboration count)
- Jurisdiction/ward-to-department mapping reference data (seeded static dataset for MVP)

**Outputs:**
- Identified department/authority entity (name, contact channel)
- Auto-drafted complaint text (formal register, includes issue category, location description, severity justification, photo reference, and citizen corroboration count if > 1)
- Routed issue status `routed`, visible to the matched authority's dashboard queue

**Business Rules:**
- BR-3.1: Routing decision is determined by (ward/jurisdiction × category) lookup against the reference mapping; if no mapping exists for a given ward, the issue routes to a generic "City Admin" fallback queue rather than being lost.
- BR-3.2: Drafted complaint text must always include: issue category, precise location (address/landmark + coordinates), severity, date first reported, and corroboration count.
- BR-3.3: Authority users may reassign a misrouted issue to a different department; reassignment events are logged and used as a (post-MVP) feedback signal to improve the routing mapping over time.

**Validation Rules:**
- Drafted complaint text is checked for minimum required fields (category, location, severity) before being marked ready; an incomplete draft blocks the `routed` status transition and is flagged for review instead.

**Edge Cases:**
- Issue spans two jurisdictions (e.g., a road that is the boundary between two wards): routed to both relevant departments with a shared issue ID, and resolution by either party closes the issue.
- Department mapping is stale/incorrect (real-world department reorganization): admin-editable mapping table allows immediate correction without a code change.

---

## Feature 4: SLA Tracking & Autonomous Escalation (Escalation Agent)

**Priority:** Must Have

**Purpose:** Ensure no routed issue is silently ignored by autonomously escalating to a higher authority tier when service-level expectations are breached.

**User Value:** Citizens do not need to manually follow up; the system applies pressure on their behalf.

**Inputs:**
- Routed issue with assigned SLA (derived from category + severity, per admin-configured SLA table)
- Current issue status and last-updated timestamp
- Escalation tier mapping (e.g., Tier 1: department officer → Tier 2: department head → Tier 3: ward councilor/public escalation)

**Outputs:**
- Escalation event (issue reassigned to next tier, or flagged for public visibility if final tier breached)
- Notification to citizen and to both the previous and new responsible authority

**Business Rules:**
- BR-4.1: SLA clock starts at the moment status becomes `routed`, not at initial `submitted` time.
- BR-4.2: SLA clock pauses (does not count against the authority) while status is `in_progress` with an active recent update (configurable grace logic to avoid penalizing authorities actively working an issue), but resumes if no update occurs within a secondary "stale `in_progress`" threshold.
- BR-4.3: Escalation is one-directional per breach event — the agent does not de-escalate automatically; de-escalation requires explicit authority/admin action.
- BR-4.4: Critical-severity issues use a compressed SLA and a shorter escalation interval than low-severity issues, per the admin-configured SLA table.

**Validation Rules:**
- Escalation Agent run cycle (default hourly, configurable) must check all active issues; any issue missed in a cycle is caught in the next cycle (idempotent — an issue is never double-escalated for the same breach event).

**Edge Cases:**
- Final escalation tier already reached and SLA breached again: issue is flagged "Publicly Escalated" and surfaced prominently (e.g., featured on a public unresolved-issues leaderboard) rather than escalating into a void.
- Authority marks status `in_progress` repeatedly without genuine progress to game the SLA pause: stale-`in_progress` threshold (BR-4.2) catches this pattern; flagged issues are surfaced to admin for manual review as a Should-Have anti-gaming control.

---

## Feature 5: Resolution Verification (Verifier Agent)

**Priority:** Must Have

**Purpose:** Confirm, via independent visual evidence, that a claimed resolution genuinely occurred — the most differentiated and underserved capability in the product.

**User Value:** Citizens get proof, not just a status label; authorities get a credible verification record they can point to.

**Inputs:**
- Original "before" photo (from initial report)
- "After" photo submitted by the authority at the same/near-identical location
- Issue category and metadata

**Outputs:**
- Verification result: `verified_resolved`, `disputed_resolution`, or `inconclusive` (requires human/citizen review)
- Confidence score and a human-readable rationale (e.g., "pothole surface filled and leveled, consistent with repair")

**Business Rules:**
- BR-5.1: An issue cannot transition to `resolved` status without an after-photo attached.
- BR-5.2: Verification confidence ≥ 0.75 → `verified_resolved`. Confidence between 0.4–0.75 → `inconclusive`, original reporter notified to confirm manually. Confidence < 0.4 → `disputed_resolution`, reopened automatically.
- BR-5.3: The original reporter retains a window (default 7 days, configurable) after `verified_resolved` to manually dispute the result even if the agent was confident; manual dispute reopens the issue and flags it for admin review.
- BR-5.4: Repeated disputed resolutions for the same authority/department are aggregated into that department's SLA compliance score (visible in impact reports) as an accountability signal.

**Validation Rules:**
- After-photo must be geotagged (or location-confirmed) within a reasonable distance of the original issue location; an after-photo from an unrelated location is rejected before it reaches the Verifier Agent.

**Edge Cases:**
- Lighting/weather differences between before/after photos affecting visual comparison: agent is designed to account for illumination normalization; if confidence is borderline due to image-quality factors rather than content, result defaults to `inconclusive` rather than `disputed_resolution`, prompting an additional photo request rather than an unfair penalty.
- Issue resolved by means not visually obvious (e.g., underground pipe repair with surface restored to plain ground): category-specific verification logic accounts for expected post-repair appearance per category rather than a generic "looks different" heuristic.
- Citizen never responds to confirm an `inconclusive` result: after the dispute window lapses with no response, the system defaults to `verified_resolved` to avoid issues being stuck in limbo indefinitely.

---

## Feature 6: Predictive Hotspot Forecasting (Predictor Agent)

**Priority:** Should Have (Must Have for full agentic-depth scoring narrative, but demoable with a smaller seeded dataset)

**Purpose:** Use historical issue data to forecast where new issues are statistically likely to occur, enabling preventive rather than purely reactive maintenance.

**User Value:** Authorities can plan proactive maintenance; citizens/community can see where attention is likely needed before a failure happens.

**Inputs:**
- Historical resolved and unresolved issue records (category, location, timestamp, severity, recurrence)
- Optional contextual signals (season/monsoon period, infrastructure age proxies if available)

**Outputs:**
- Hotspot forecast layer: geographic clusters with predicted issue category, estimated likelihood/risk score, and recommended preventive action category

**Business Rules:**
- BR-6.1: Forecasts are regenerated on a scheduled cadence (default weekly) and are clearly timestamped with "last generated" metadata; forecasts are never presented as live/real-time.
- BR-6.2: A minimum historical data volume threshold per area is required before a forecast is generated for that area (avoids low-confidence predictions on sparse data); areas below threshold show "insufficient data" rather than a fabricated forecast.

**Validation Rules:**
- Forecast confidence below a configurable threshold is suppressed from the public-facing map (shown only in the admin/authority view) to avoid public confusion from low-confidence predictions.

**Edge Cases:**
- Insufficient historical data at hackathon-demo time: system ships with a seeded illustrative historical dataset (clearly labeled as demo/seed data in the admin view) so the predictive feature is demoable without requiring months of real production data.

---

## Feature 7: Community Impact Reporting

**Priority:** Should Have

**Purpose:** Translate raw issue data into quantified, shareable impact metrics that build public trust and provide a compelling demo/judging narrative.

**User Value:** Citizens and the public see tangible evidence that civic participation produces measurable outcomes.

**Inputs:**
- Aggregated issue data for a given ward/area and time period (counts by status, resolution times, escalation counts, verification outcomes)

**Outputs:**
- A periodic impact report containing: total issues reported, resolution rate, average time-to-resolution, average time-to-verified-resolution, escalation rate, estimated cost/time savings (using configurable per-category cost proxies, e.g., average vehicle damage cost avoided per pothole resolved), and a composite "civic health score" (0–100) per ward.
- Exportable as a shareable view/PDF.

**Business Rules:**
- BR-7.1: Cost/savings estimates must be clearly labeled as estimates derived from configurable proxy values, never presented as audited financial figures.
- BR-7.2: Civic health score formula and weighting must be documented and consistent across reporting periods (no silent recalibration that would make trend comparisons misleading).

**Validation Rules:**
- Reports are only generated for periods with at least a minimum issue-count threshold to avoid statistically meaningless scores for very low-activity wards.

**Edge Cases:**
- Ward with zero reported issues in a period: report explicitly states "no activity recorded" rather than a misleading 0%/100% score.

---

## Feature 8: Authority Dashboard

**Priority:** Must Have

**Purpose:** Give authority users a focused, actionable queue of routed issues with SLA visibility.

**User Value:** Replaces ad hoc/manual complaint handling with a structured, prioritized worklist.

**Inputs:** Routed issues assigned to the authority's department/jurisdiction.

**Outputs:** Filterable/sortable issue list (by status, severity, SLA-risk), issue detail view, status-update and after-photo-upload actions.

**Business Rules:**
- BR-8.1: Issues within 20% of their SLA deadline are visually flagged as "at risk" before breach occurs, not only after.
- BR-8.2: Authority users can only act on issues routed to their own department/jurisdiction (role/jurisdiction-scoped access).

**Validation Rules:** Status transitions must follow the defined state machine (see `user_flows.md`); illegal transitions (e.g., `submitted` → `resolved` skipping `routed`/`in_progress`) are rejected by the API layer.

**Edge Cases:** Authority user attempts to mark `resolved` without an after-photo — blocked client-side and server-side per BR-5.1.

---

## Feature 9: Citizen App — Tracking & Notifications

**Priority:** Must Have

**Purpose:** Let citizens see the live status of their own reports and nearby community issues.

**User Value:** Transparency and trust — the core trust deficit the product is designed to fix.

**Inputs:** Citizen's own submitted issues; public issue map for the citizen's area.

**Outputs:** Status timeline per issue; map view of nearby issues (with privacy-respecting display rules); notification feed.

**Business Rules:**
- BR-9.1: A citizen can always see the full status history of their own report, including escalation events and verification results.
- BR-9.2: Public map view shows issue category, severity, and status, but never the original reporter's identity unless the reporter explicitly opts in to public attribution.

**Edge Cases:** Anonymous reporter (no contact identifier) — issue still appears on the public map but has no personal tracking view tied to an account.

---

## Feature 10: Gamification — Hero Points & Leaderboard

**Priority:** Nice to Have

**Purpose:** Encourage sustained, genuine civic participation.

**User Value:** Recognition and light social proof for constructive reporting behavior.

**Inputs:** Citizen's verified, non-duplicate report history.

**Outputs:** Point balance, ward-level leaderboard (opt-in).

**Business Rules:**
- BR-10.1: Points are awarded only after an issue reaches `routed` status (not for unvalidated submissions), to discourage spam reporting for points.
- BR-10.2: A bonus point multiplier applies if the citizen's report leads to a `verified_resolved` outcome (rewarding genuinely actionable reports over noise).

**Edge Cases:** Citizen opts out of leaderboard visibility at any time without losing accrued points (points remain private to their own profile).
