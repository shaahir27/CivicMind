# CivicSense — API Specification

> This document outlines the Express REST API endpoints implemented in the backend package.

---

## 1. Overview
- **Base URL (Local):** `http://localhost:4000/api`
- **Auth Scheme:** Firebase Auth Bearer Tokens (`Authorization: Bearer <token>`)
- **Content Type:** `application/json` (except for direct photo uploads which bypass the API directly to Cloud Storage via Firebase SDK, submitting URLs instead).

---

## 2. Issues API

### `POST /api/issues`
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
- **Response:**
  ```json
  {
    "id": "issue-123",
    "status": "pending_validation",
    "category": "pothole",
    "severity": "high"
  }
  ```

### `GET /api/issues`
- **Purpose:** Fetches issues. Can be filtered by assigned department (for authorities) or globally (for admin/map).
- **Auth Required:** `true`

### `POST /api/issues/:id/resolve`
- **Purpose:** Submits a resolution for an issue. Triggers the Verifier Agent.
- **Auth Required:** `true` (Authority only)
- **Body:**
  ```json
  {
    "resolutionImageUrls": ["https://storage.googleapis.com/..."],
    "resolutionNotes": "Fixed the pothole with hot mix asphalt."
  }
  ```

### `POST /api/issues/:id/escalate`
- **Purpose:** Manually trigger escalation (usually handled by internal cron).
- **Auth Required:** `true` (Admin only)

---

## 3. Logs & Analytics API

### `GET /api/logs`
- **Purpose:** Retrieves the AI agent invocation logs for the Admin Console.
- **Auth Required:** `true` (Admin only)

### `GET /api/stats`
- **Purpose:** Retrieves aggregated statistics (total resolved, SLA breaches) for the Landing Page and Admin Console.
- **Auth Required:** `false`

---

## 4. Error Handling
The API follows standard HTTP status codes:
- `200/201`: Success
- `400`: Bad Request (invalid payload)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (wrong role, e.g., Citizen trying to resolve a ticket)
- `500`: Internal Server Error (Agent invocation failed)
