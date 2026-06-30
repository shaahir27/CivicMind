# CivicSense — Achieved Scope

> This document details the exact scope achieved during the final build phase.

---

## 1. What We Built (In-Scope Achieved)

### The Monorepo
- **Landing Page:** A unified bridge directing Citizens, Authorities, and Admins to their respective portals, now featuring a live **Transparency Portal**.
- **Citizen App (PWA):** Mobile-first reporting with AI vision extraction, live **WhatsApp notifications**, and a Gamified **Profile Dashboard** (Civic Trust points).
- **Authority Portal:** Desktop dashboard for managing routed tickets via a **Kanban board**, messaging citizens, and submitting resolutions.
- **Admin Console:** Oversight portal for monitoring AI agent logs and system health.
- **Node.js Backend:** The orchestrator housing the 6 AI agents, webhooks for Twilio, and Trust ledger.

### AI Agent Stack (Gemini 3.1 Flash-Lite via `@google/genai`)
1. **Reporter Agent:** Extracts category/severity from images.
2. **Validator Agent:** Checks location/image similarity to prevent duplicates.
3. **Router Agent:** Maps issues to the correct department.
4. **Escalation Agent:** Automatically upgrades severity on SLA breach.
5. **Verifier Agent:** Confirms authority resolution via before/after photo comparison and automatically awards **Civic Trust Points** to the citizen.
6. **Predictor Agent:** Aggregates Firestore data to identify recurring issue zones.

---

## 2. What We Deferred (Future Roadmap)

- **Native Mobile Apps (iOS/Android):** We built a highly responsive PWA to ensure cross-platform availability immediately. Native wrappers (React Native / Flutter) are deferred to post-MVP.
- **Live Municipal Integrations:** For the MVP, we use the custom `Authority Portal`. Future versions will provide Webhooks/APIs to push tickets directly into legacy software (e.g., Cityworks, Accela).
- **Vertex AI Predictive Modeling:** The MVP uses Firebase aggregations for hotspot mapping. Future versions will train a dedicated Vertex AI ML model on multi-year city data to predict infrastructure failures before they happen.
- **Blockchain / Web3 Transparency:** Deferred. Current transparency is achieved via public API stats on the Landing Page and an internal ledger for Civic Trust, rather than a distributed ledger.
