# CivicSense — Product Requirements

> This document lists the core requirements that the CivicSense MVP successfully fulfilled.

---

## 1. Functional Requirements

### Citizen Journey
- **FR-1:** Users must be able to submit a report by uploading a single photo and optionally providing location/text.
- **FR-2:** The system must use AI to automatically extract the category and severity from the photo.
- **FR-3:** Citizens must be able to view a timeline of their report (Submitted → Assigned → Escalated → Resolved).

### Authority Journey
- **FR-4:** Authorities must see a filtered queue of issues assigned only to their department.
- **FR-5:** Authorities must be able to submit a resolution by uploading an "after" photo.
- **FR-6:** The AI must verify the "after" photo against the "before" photo to close the ticket.

### Admin/System Journey
- **FR-7:** The system must run a cron job to automatically escalate issues that breach department SLAs.
- **FR-8:** Admins must have a portal to view all system users, global maps, and raw AI agent logs.
- **FR-9:** The Landing Page must serve as a central hub directing traffic to the Citizen, Authority, and Admin portals.

---

## 2. Non-Functional Requirements

- **NFR-1 (Architecture):** The system must be structured as a Monorepo to share configurations across the backend and 4 frontend packages.
- **NFR-2 (AI):** The system must utilize OpenRouter / Gemini 3.1 Flash-Lite for multimodal reasoning.
- **NFR-3 (Database):** The system must use Firebase Firestore for real-time document synchronization.
- **NFR-4 (Security):** All API endpoints must be secured using Firebase Auth Bearer tokens, with strict role-based access control (Citizen vs Authority vs Admin).
- **NFR-5 (Hosting):** Frontends must be deployed as static sites to Firebase Hosting. The backend must be containerized and deployed to Google Cloud Run.
