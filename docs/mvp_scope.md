# CivicSense — Achieved MVP Scope

> This document details the exact scope achieved during the hackathon/MVP build phase.

---

## 1. What We Built (In-Scope Achieved)

### The Monorepo
- **Landing Page:** A unified bridge directing Citizens, Authorities, and Admins to their respective portals.
- **Citizen App (PWA):** Mobile-first reporting with AI vision extraction.
- **Authority Portal:** Desktop dashboard for managing routed tickets and submitting resolutions.
- **Admin Console:** Oversight portal for monitoring AI agent logs and system health.
- **Node.js Backend:** The orchestrator housing the 6 AI agents.

### AI Agent Stack (Gemini 3.1 Flash-Lite via `@google/genai`)
1. **Reporter Agent:** Extracts category/severity from images.
2. **Validator Agent:** Checks location/image similarity to prevent duplicates.
3. **Router Agent:** Maps issues to the correct department.
4. **Escalation Agent:** Automatically upgrades severity on SLA breach.
5. **Verifier Agent:** Confirms authority resolution via before/after photo comparison.
6. **Predictor Agent:** (Simplified for MVP) Aggregates Firestore data to identify recurring issue zones.

---

## 2. What We Deferred (Future Roadmap)

- **Native Mobile Apps (iOS/Android):** We built a highly responsive PWA to ensure cross-platform availability immediately. Native wrappers (React Native / Flutter) are deferred to post-MVP.
- **Live Municipal Integrations:** For the MVP, we use the custom `Authority Portal`. Future versions will provide Webhooks/APIs to push tickets directly into legacy software (e.g., Cityworks, Accela).
- **Vertex AI Predictive Modeling:** The MVP uses Firebase aggregations for hotspot mapping. Future versions will train a dedicated Vertex AI ML model on multi-year city data to predict infrastructure failures before they happen.
- **Blockchain / Web3 Transparency:** Deferred. Current transparency is achieved via public API stats on the Landing Page rather than a distributed ledger.
