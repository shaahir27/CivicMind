# CivicMind — MVP Scope

> Prioritization is reconciled with `feature_specifications.md` priority tags. This document is authoritative on **scope boundaries for the hackathon build**; `feature_specifications.md` is authoritative on **behavioral detail** for whatever is in scope.

---

## 1. Must Have (Demo-Critical — without these, the core narrative fails)

These features must work end-to-end, live, in the demo:

1. **Citizen Issue Reporting** (Feature 1) — photo + location capture, Reporter Agent classification, citizen confirmation.
2. **Duplicate Detection & Community Validation** (Feature 2) — at minimum the deterministic geo+category matching with confidence-based auto-merge/confirm flow; visual-similarity scoring can use a simplified heuristic if full vision-model comparison proves too slow to implement within the window, but the *behavior* (merge vs. prompt vs. new) must be demoable.
3. **Intelligent Routing & Complaint Drafting** (Feature 3) — department identification via seeded jurisdiction mapping + AI-drafted complaint text.
4. **SLA Tracking & Autonomous Escalation** (Feature 4) — this is a primary "Agentic Depth" demo moment. Must be demonstrable live (e.g., using compressed demo SLA windows — minutes instead of days — so escalation visibly happens during the judging window).
5. **Resolution Verification** (Feature 5) — before/after vision comparison producing `verified_resolved` / `disputed_resolution` / `inconclusive`. This is the single most differentiating feature and cannot be cut.
6. **Authority Dashboard** (Feature 8) — issue queue, status update actions, after-photo upload requirement.
7. **Citizen App — Tracking & Notifications** (Feature 9) — at minimum in-app status timeline; push/SMS/email can be simplified to in-app only if external notification provider integration is time-constrained, but the citizen must be able to see live status change without manual refresh.
8. **Core admin configuration:** SLA thresholds and jurisdiction mapping must be seeded/configurable (does not require a polished Admin Console UI for MVP — a minimal settings screen or even a seeded config file is acceptable if time-constrained, but the *capability* for an admin to override defaults should exist).

## 2. Should Have (Strengthens the demo significantly, build if time allows after Must Haves are solid)

1. **Predictive Hotspot Forecasting** (Feature 6) — even a heuristic/statistical implementation (per the cost/latency design note in `system_architecture.md`) over a seeded historical dataset substantially strengthens the "Agentic Depth" and "Innovation" scoring. Strongly recommended to attempt once Must Haves are stable.
2. **Community Impact Reporting** (Feature 7) — at least one generated example report with quantified metrics is high-value for the "Problem Solving & Impact" criterion narrative, even if the generation process is simplified (e.g., one manually-triggered report rather than a fully automated scheduler) for the demo.
3. **Full Admin Console UI** (polished versions of SLA Configuration, Jurisdiction Mapping, Agent Decision Audit Log screens) — valuable for demonstrating configurability and auditability, but the underlying capability (Must Have item 8) matters more than the UI polish.
4. **Multi-channel notifications** (SMS/email/push beyond in-app) — valuable for realism but not required to prove the core lifecycle.
5. **Offline-tolerant report drafting** (retain draft locally on upload failure).
6. **Voice-to-text description input** (accessibility/usability enhancement).
7. **Regional language support** beyond English.

## 3. Nice to Have (Cut first if time is short; do not let these consume build time before Must/Should items are solid)

1. **Gamification — Hero Points & Leaderboard** (Feature 10) — fun and demonstrates community-engagement thinking, but not core to the agentic-architecture narrative that wins this hackathon category.
2. **Social sharing of report status/impact reports.**
3. **Face/license-plate blurring in photos** (important for production privacy posture, listed explicitly so it is not forgotten, but acceptable to omit for a hackathon demo using clearly non-sensitive demo photos).
4. **Issue reassignment workflow polish** (basic reassignment capability can exist as a Must-Have-adjacent admin/authority action; a fully polished UX flow with reason-taxonomy and feedback-loop learning is not needed for MVP).
5. **Real integration with actual municipal complaint APIs/email systems** — MVP uses a CivicMind-native Authority Portal exclusively; live third-party integration is explicitly out of scope.

## 4. Explicitly Out of Scope for MVP (do not build, even partially)

- Native mobile apps (iOS/Android) — PWA/responsive web only.
- Multi-city/multi-tenant configuration management (single demo city/dataset is sufficient).
- Payment or bounty/funding mechanisms of any kind.
- Blockchain/token-based governance (explicitly evaluated and rejected per `solution_overview.md` Concept B).
- Full production-grade authentication hardening (e.g., advanced fraud detection on guest sessions) — basic OTP/credentialed auth is sufficient.
- Formal SLA/uptime commitments to real users — this is a demo system.
- Automated translation pipelines — if multiple languages are supported, strings are manually translated/seeded, not machine-translated at runtime.

---

## 5. Future Roadmap (Post-Hackathon, Not Part of Current Build)

These are documented here so AI coding agents do not architect themselves into a corner, even though none of this is built now:

1. **Real municipal system integration** — API/email connectors to actual government complaint-management systems, replacing the CivicMind-native Authority Portal as the system of record (or federating with it).
2. **Production-grade Predictor Agent** — fully trained Vertex AI model on real multi-year historical infrastructure data, replacing the MVP heuristic.
3. **Multi-city/multi-tenant architecture** — jurisdiction mapping and SLA config become tenant-scoped rather than single-deployment-scoped.
4. **Native mobile apps** with offline-first architecture and background photo upload queuing.
5. **Department feedback loop for routing accuracy** — using logged reassignment events (per BR-3.3) to retrain/tune the jurisdiction mapping over time.
6. **Public accountability features** — ward-level public dashboards comparing department performance, potentially integrated with local journalism/civic-tech partners.
7. **Advanced anti-gaming/fraud detection** — for both citizen-side (fake reports) and authority-side (gaming SLA pauses, per Edge Case in Feature 4) behavior, beyond the MVP's basic thresholds.
8. **Formal accessibility audit and WCAG compliance certification.**
9. **Bounty/incentive mechanisms** for high-impact civic participation (carefully scoped to avoid the pitfalls identified in the rejected blockchain concept).
