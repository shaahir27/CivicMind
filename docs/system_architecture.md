# CivicSense — System Architecture

> This document describes the final, implemented architecture of CivicSense as of the MVP completion.

---

## 1. High-Level Architecture

CivicSense is composed of a unified monorepo containing five distinct packages:

1. **`packages/landing-page` (Frontend)** — The central bridge and marketing site directing traffic to the respective portals.
2. **`packages/citizen-app` (Frontend)** — Mobile-first PWA for citizen report submission (photo, location, description).
3. **`packages/authority-portal` (Frontend)** — Desktop-first dashboard for department officials to manage and resolve issues.
4. **`packages/admin-console` (Frontend)** — System oversight portal for monitoring AI logs, users, and overall health.
5. **`packages/backend` (Backend)** — A Node.js/Express server housing the **Agent Orchestrator** (powered by OpenRouter & Gemini 2.5 Pro) that coordinates downstream agents, manages issue state, and handles API requests.

**Architectural principle:** The backend orchestrator is the *only* component that talks to the LLM and the database. The frontends communicate exclusively with the backend via REST API.

---

## 2. Frontend Architecture (React 18 + Vite + TypeScript)

### 2.1 Citizen App
- **Platform:** Mobile-first responsive web app (PWA).
- **Core screens:** Auth, Home/Map, Report Capture (Camera + Geo), Report Confirmation/Status, My Reports, Issue Detail/Timeline.
- **State management:** React Context + React Query for data fetching from the backend API.

### 2.2 Authority Portal
- **Platform:** Desktop-first responsive web app.
- **Core screens:** Login, Department Dashboard (issue queue), Issue Detail/Action view (Resolution submission).
- **Functionality:** View assigned tickets mapped by the AI, submit resolution photos.

### 2.3 Admin Console
- **Platform:** Desktop web app.
- **Core screens:** Dashboard, Users List, System Logs.
- **Functionality:** Monitor AI agent decisions, view all system users, and oversee the entire database state.

### 2.4 Landing Page
- **Platform:** Responsive web app.
- **Core screens:** Hero (with 3D globe and live mockups), Dual Ecosystem breakdown, Footer.
- **Functionality:** Bridges citizens and authorities into their respective portals.

---

## 3. Backend Architecture (Node.js + Express)

### 3.1 Orchestration Service
- A central Express server responsible for:
  - Receiving frontend requests.
  - Sequencing agent invocations via OpenRouter (Gemini 2.5 Pro).
  - Persisting state transitions in Firebase Firestore.

### 3.2 Agent Services
Each agent is implemented as a functional module within the backend:

| Agent | Invocation Pattern | Primary Responsibility |
|---|---|---|
| Reporter Agent | Synchronous, per-submission | Vision-based classification + severity scoring |
| Validator Agent | Synchronous, per-submission | Duplicate detection, community consensus check |
| Router Agent | Synchronous, per-validated-issue | Department identification |
| Escalation Agent | Scheduled (Cron), batch | SLA monitoring, auto-escalation |
| Verifier Agent | Synchronous, per-resolution | Before/after vision comparison |
| Predictor Agent | Scheduled (Cron), batch | Historical pattern analysis (simplified for MVP) |

### 3.3 Scheduling
- We utilize `node-cron` inside the backend process to run the Escalation Agent sweeps, replacing the need for external Cloud Scheduler in the MVP.

---

## 4. Database Architecture (Firebase Firestore)

- **Firestore (NoSQL)** is the primary operational store for `issues`, `users`, `departments`, and `logs`.
- **Cloud Storage** holds all photo evidence (before/after images), referenced by URL from Issue records.
- **Analytics:** Accomplished via Firestore aggregations instead of an external warehouse like BigQuery.

---

## 5. External Services / APIs

| Service | Purpose | Notes |
|---|---|---|
| OpenRouter (Gemini 2.5 Pro) | Orchestrator reasoning, Vision analysis | Handles both text reasoning and multimodal image analysis |
| Google Maps Platform / Leaflet | Geocoding, map rendering | Used by frontends for interactive maps |
| Firebase Auth | Authentication | Handles Email/Password and Anonymous sign-ins |
| Firebase Admin SDK | Backend DB access | Secures all database transactions |

---

## 6. Deployment Architecture

- **Frontends:** All 4 frontend packages are configured as static sites and deployed seamlessly to **Firebase Hosting** using multi-site configuration.
- **Backend:** Containerized using Docker and deployed to **Google Cloud Run** for serverless, autoscaling execution.
