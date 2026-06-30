# CivicSense — Feature Specifications

> This document describes the fully implemented feature set of the CivicSense monorepo as built (Phases 1-4).

---

## 1. Landing Page (The Bridge)
**Purpose:** Acts as the entry point for all users, explaining the dual ecosystem and directing traffic to the correct portal.
**Key Capabilities:**
- **Dual Ecosystem Presentation:** Visually splits the value proposition for Citizens vs. Authorities.
- **Floating Live Mockups:** 3D UI elements demonstrating real-time AI capabilities.
- **Unified Routing:** Provides direct links to the Citizen App, Authority Portal, and Admin Console.
- **Transparency Portal:** (Phase 3) A public-facing dashboard showing real-time metrics on city-wide civic health, total issues resolved, and average resolution times.

---

## 2. Citizen App
**Purpose:** A mobile-first PWA for citizens to report issues effortlessly.
**Key Capabilities:**
- **AI-Powered Reporting:** Upload a photo and location. The AI automatically classifies the issue, determines severity, and drafts the description.
- **Live Tracking:** Real-time status updates (Submitted → In Progress → Resolved) via Firebase listeners.
- **WhatsApp Integration:** (Phase 3) Citizens receive real-time status updates directly to their WhatsApp via Twilio Webhooks.
- **Gamification & Reputation:** (Phase 4) A dedicated Profile Dashboard where citizens earn "Civic Trust" points when their reported issues are AI-verified as resolved, unlocking higher ranks and escalation tokens.
- **CSAT Feedback:** (Phase 3) Citizens can rate the quality of the resolution once verified.
- **Authentication:** Firebase Anonymous auth or standard Email/Password to keep a history of reports.

---

## 3. Authority Portal
**Purpose:** A desktop dashboard for municipal workers to manage their workflow.
**Key Capabilities:**
- **Kanban-Style Issue Queue:** (Phase 3) A drag-and-drop or categorized column view for managing tickets (Open → Assigned → In Progress → Resolved).
- **Intelligent Routing Queue:** Authorities only see issues assigned to their specific department (determined by the Router Agent).
- **Messaging Thread:** Authorities can message citizens directly on a specific issue for clarifications.
- **Resolution Verification:** Authorities upload an "after" photo. The AI Verifier Agent compares it to the "before" photo to ensure the fix is legitimate before closing the ticket.
- **SLA Tracking:** Visual indicators for tickets nearing their SLA deadlines.

---

## 4. Admin Console
**Purpose:** System oversight for administrators.
**Key Capabilities:**
- **Global Map:** View every issue across the entire city in real-time.
- **User Management:** View all registered users (Citizens, Authorities, Admins) and their roles.
- **AI Log Monitoring:** View system logs and errors for agent invocations.

---

## 5. AI Agent Capabilities (Backend)
**Purpose:** The brains of the operation, removing human triaging.
- **Reporter Agent:** Analyzes the citizen's photo to extract `category` (e.g., Pothole, Graffiti) and `severity` (e.g., High, Low).
- **Validator Agent:** Checks for duplicates based on location proximity and visual similarity to prevent queue spam.
- **Router Agent:** Maps the classified issue to the correct government department (e.g., Department of Transportation).
- **Escalation Agent:** Periodically sweeps the database and automatically escalates issues that breach SLA timers.
- **Verifier Agent:** (Phase 4 Gamification) Compares before and after photos to confirm resolution. Upon success, triggers the `awardCivicTrust` protocol to reward the original reporter.
- **Predictor Agent:** Analyzes historical data to flag recurring issue hotspots.
