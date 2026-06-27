# CivicSense — Feature Specifications

> This document describes the implemented feature set of the CivicSense monorepo as built.

---

## 1. Landing Page (The Bridge)
**Purpose:** Acts as the entry point for all users, explaining the dual ecosystem and directing traffic to the correct portal.
**Key Capabilities:**
- **Dual Ecosystem Presentation:** Visually splits the value proposition for Citizens vs. Authorities.
- **Floating Live Mockups:** 3D UI elements demonstrating real-time AI capabilities.
- **Unified Routing:** Provides direct links to the Citizen App, Authority Portal, and Admin Console.

---

## 2. Citizen App
**Purpose:** A mobile-first PWA for citizens to report issues effortlessly.
**Key Capabilities:**
- **AI-Powered Reporting:** Upload a photo and location. The AI automatically classifies the issue, determines severity, and drafts the description.
- **Live Tracking:** Real-time status updates (Submitted → In Progress → Resolved) via Firebase listeners.
- **Authentication:** Firebase Anonymous auth or standard Email/Password to keep a history of reports.

---

## 3. Authority Portal
**Purpose:** A desktop dashboard for municipal workers to manage their workflow.
**Key Capabilities:**
- **Intelligent Routing Queue:** Authorities only see issues assigned to their specific department (determined by the Router Agent).
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
- **Verifier Agent:** Compares before and after photos to confirm resolution.
- **Predictor Agent:** Analyzes historical data to flag recurring issue hotspots.
