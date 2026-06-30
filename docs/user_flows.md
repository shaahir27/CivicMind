# CivicSense — User Flows

> This document describes the primary user journeys across the CivicSense monorepo.

---

## 1. Global Entry (Landing Page)
1. User lands on `http://localhost:5176` (Landing Page).
2. User is presented with the Dual Ecosystem value proposition.
3. User views the **Transparency Portal** to see live city-wide metrics.
4. User selects their identity:
   - Clicks **Citizen Login** → Redirected to Citizen App (`localhost:5173`).
   - Clicks **Official Login** → Opens dropdown to select Authority Portal (`localhost:5174`) or Admin Console (`localhost:5175`).

---

## 2. The Citizen Journey (Reporting & Gamification)
1. Citizen opens the **Citizen App**.
2. Authenticates via Anonymous Auth (no sign-up required) or Email/Password.
3. Views the Home Map showing nearby issues.
4. Clicks the floating **Camera Button**.
5. Uploads a photo of a civic issue (e.g., Pothole) and optionally drops a map pin.
6. Submits the report.
7. *Backend Orchestrator engages:* Reporter Agent classifies the image, Validator Agent checks for duplicates, Router Agent assigns to "Department of Transportation".
8. Citizen is redirected to the **Issue Timeline** page, watching the status change to `open` in real-time.
9. **WhatsApp Update:** If opted in, citizen receives an automated WhatsApp message via Twilio confirming receipt.
10. **Gamification & Proof of Impact:** Once the authority marks the issue as resolved and the AI Verifier confirms the fix, the citizen receives **Civic Trust Points**. They can view their updated rank in the **Profile Dashboard**.
11. **CSAT:** Citizen is prompted via WhatsApp or App to submit a 1-5 star rating on the resolution quality.

---

## 3. The Authority Journey (Resolution & Kanban)
1. Municipal worker opens the **Authority Portal**.
2. Logs in with credentialed account (role: `authority`, department: `dot`).
3. Views the **Dashboard Kanban Queue**. They only see issues routed to the `dot` department.
4. Worker assigns a **Field Worker** to the ticket and moves it to `In Progress`.
5. If necessary, the authority uses the **Messaging Thread** to ask the citizen for clarifying directions.
6. Worker physically fixes the pothole.
7. In the portal, worker clicks **Submit Resolution** on the specific ticket.
8. Worker uploads an "after" photo of the fixed pothole.
9. *Backend Orchestrator engages:* Verifier Agent compares the citizen's "before" photo to the worker's "after" photo. 
10. If AI confirms the fix, status changes to `verified_resolved`. If rejected, worker is prompted to provide better evidence.

---

## 4. The Admin Journey (Oversight)
1. Administrator opens the **Admin Console**.
2. Logs in with credentialed account (role: `admin`).
3. Views the global KPI dashboard (total issues, SLA breaches).
4. Navigates to **System Logs**.
5. Views raw JSON outputs from the LLM to audit why a specific ticket was classified as "High Severity".
6. Navigates to **Users**.
7. Views all registered accounts and can manually assign departments to new municipal workers.
