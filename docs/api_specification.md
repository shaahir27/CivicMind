# CivicSense — API Specification

> This document outlines the Express REST API endpoints implemented in the backend package.

---

## 1. Overview
- **Base URL (Local):** `http://localhost:4000/api/v1`
- **Auth Scheme:** Firebase Auth Bearer Tokens (`Authorization: Bearer <token>`)
- **Content Type:** `application/json` (except for direct photo uploads which bypass the API directly to Cloud Storage via Firebase SDK, submitting URLs instead).

---

## 2. Issues API

### `POST /api/v1/issues`
- **Purpose:** Submits a new citizen report. Triggers the Reporter and Router agents.
- **Auth Required:** `true` (Citizen or Anonymous)
- **Body:**
  ```json
  {
    "location": { "lat": 40.7128, "lng": -74.0060 },
    "imageUrls": ["https://storage.googleapis.com/..."],
    "description": "Optional user context"
  }
  ```

### `GET /api/v1/issues`
- **Purpose:** Fetches issues. Can be filtered by assigned department (for authorities) or globally (for admin/map).
- **Auth Required:** `true`

### `POST /api/v1/issues/:id/resolve`
- **Purpose:** Submits a resolution for an issue. Triggers the Verifier Agent.
- **Auth Required:** `true` (Authority only)

---

## 3. Gamification & Trust API (Phase 4)

### `GET /api/v1/trust/leaderboard`
- **Purpose:** Fetches the top-ranked citizens by Civic Trust score.
- **Auth Required:** `true`

### `POST /api/v1/trust/events`
- **Purpose:** Admin/AI endpoint to manually or programmatically award trust points (triggered internally by the Verifier Agent on success).
- **Auth Required:** `true` (Admin or Internal Service Account)

---

## 4. Webhooks & Integrations (Phase 3)

### `POST /api/v1/webhook/twilio`
- **Purpose:** Receives incoming WhatsApp messages from citizens (e.g., feedback or status checks) and maps them to the respective issue.
- **Auth Required:** `false` (Validated via Twilio Signature)

---

## 5. Public & Transparency API (Phase 3)

### `GET /api/v1/public/metrics`
- **Purpose:** Retrieves real-time aggregated statistics (total resolved, active workers, average resolution time) for the Landing Page Transparency Portal.
- **Auth Required:** `false`

---

## 6. Logs & Analytics API

### `GET /api/v1/logs`
- **Purpose:** Retrieves the AI agent invocation logs for the Admin Console.
- **Auth Required:** `true` (Admin only)

---

## 7. Error Handling
The API follows standard HTTP status codes:
- `200/201`: Success
- `400`: Bad Request (invalid payload)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (wrong role)
- `500`: Internal Server Error (Agent invocation failed)
