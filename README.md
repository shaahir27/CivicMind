# CivicSense

**Your neighborhood's AI co-pilot.**

---

## Product Summary

CivicSense is an autonomous civic intelligence platform that replaces the passive "complaint box" model of existing civic-reporting apps with a coordinated stack of AI agents that own the entire issue lifecycle — from intake through validated resolution — on the citizen's behalf.

A citizen reports a civic issue (pothole, broken streetlight, garbage overflow, water leakage, etc.) with nothing more than a photo, a location, and an optional short description. From that point forward, CivicSense's agents validate the report, identify and notify the correct government department, track the response against service-level expectations, escalate automatically if ignored, and verify — using independent before/after computer vision — that any claimed fix was a real fix. 

---

## Screenshots

![Citizen photo capture → AI classification screen]()
![Authority dashboard with live SLA countdown]()
![Escalation event OR before/after verification comparison]()

---

## Key Features

| Feature | What It Does |
|---|---|
| **AI-Powered Reporting** | Classify and score severity directly from a citizen's photo — no manual form-filling |
| **Intelligent Routing** | Auto-identify the correct department and auto-draft a formal complaint |
| **Autonomous SLA Escalation** | Auto-escalate unaddressed issues to higher authority tiers without citizen follow-up |
| **Resolution Verification** | Before/after AI vision comparison certifies that "resolved" means actually resolved |
| **Authority Dashboard** | A structured, SLA-aware worklist replacing ad hoc complaint handling |
| **Admin Console** | System-wide oversight for AI monitoring and ecosystem health |

---

## Architecture & Monorepo Structure

CivicSense is built as a modern TypeScript monorepo using npm workspaces. It contains 5 distinct packages:

1. **`packages/landing-page`**: The central bridge. A highly optimized, responsive marketing site that directs traffic to the appropriate portals.
2. **`packages/citizen-app`**: A mobile-first progressive web app (PWA) optimized for taking photos and tracking issue status on the go.
3. **`packages/authority-portal`**: A desktop-first dashboard designed for municipal workers to view assigned tickets, interact with the AI, and resolve issues.
4. **`packages/admin-console`**: A high-level oversight portal for system administrators to view system health, AI logs, and global metrics.
5. **`packages/backend`**: A Node.js/Express server that houses the powerful **AI Orchestrator**. This orchestrator manages the state of all issues and communicates with the 6 specialized AI Agents (Reporter, Validator, Router, Escalation, Verifier, Predictor).

---

## Tech Stack

| Layer | Technology Used |
|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & UI** | Pure CSS (Variables, Flexbox, Grid), Framer Motion, React-Toastify |
| **Maps & Geo** | `@vis.gl/react-google-maps` (Google Maps Platform) |
| **Backend API** | Node.js, Express, TypeScript |
| **AI Orchestration** | `@google/genai` (Google's Native SDK using Gemini 3.1 Flash-Lite for low-latency multimodal agent inference) |
| **Database** | Firebase Firestore (NoSQL Document Store) |
| **Storage (Photos)** | Firebase Cloud Storage |
| **Authentication** | Firebase Auth (Email/Password, Anonymous) |
| **Job Scheduling** | Node `node-cron` for Escalaration & Predictive sweeps |

---

**Google AI Studio**: Gemini API access for all agents is provisioned via Google AI Studio (aistudio.google.com).

---

## Getting Started (Local Development)

### 1. Prerequisites
- Node.js (v18 or higher)
- A Firebase Project (with Firestore, Storage, and Auth enabled)
- A Google Gemini API Key

### 2. Installation
Clone the repository and install all dependencies from the root:
```bash
git clone https://github.com/shaahir27/CivicMind.git
cd CivicSense
npm install
```

### 3. Environment Variables
You need to set up two environment files.

**Root level (`.env`):**
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
```

**Backend level (`packages/backend/.env`):**
```env
PORT=4000
FRONTEND_URL=http://localhost:5173
GOOGLE_GENAI_API_KEY=your_gemini_key
# Firebase Admin SDK credentials
FIREBASE_PROJECT_ID=your_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key"
```

### 4. Running the Project
The monorepo uses concurrently to run the entire stack.

**Start the Backend:**
```bash
npm run dev:backend
```

**Start all 4 Frontends simultaneously:**
```bash
npm run dev:frontends
```

The apps will be available at:
- Landing Page: `http://localhost:5176`
- Citizen App: `http://localhost:5173`
- Authority Portal: `http://localhost:5174`
- Admin Console: `http://localhost:5175`

---

## Deployment

The project is fully configured for production deployment:
- **Frontends**: Use the included `firebase.json` to deploy all 4 sites to Firebase Hosting simultaneously. Ensure you set the production URLs in your environment variables before building (`npm run build:frontends`).
- **Backend**: A `Dockerfile` is included in the root directory. The backend is designed to be deployed flawlessly to Google Cloud Run.

---

## Documentation

Initial planning and specification documents are located in the `/docs` folder. Note that the live architecture described in this README supersedes the initial MVP specifications found in the `docs` directory, as the system evolved into a more robust monorepo architecture during development.
