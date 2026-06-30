# CivicSense — Database Design

> This document reflects the final Firebase Firestore NoSQL schema implemented in the CivicSense backend.

---

## 1. Global Database Architecture
- **Primary Database:** Firebase Firestore (NoSQL).
- **Blob Storage:** Firebase Cloud Storage (for images).
- **Authentication:** Firebase Auth (User UUIDs map directly to Firestore document IDs where applicable).

---

## 2. Collections & Documents

### 2.1 Collection: `users`
Stores all registered entities interacting with the platform.

- **Document ID:** Firebase Auth UID
- **Fields:**
  - `role` (string): `"citizen" | "authority" | "admin"`
  - `email` (string, optional)
  - `display_name` (string, optional)
  - `department_id` (string, optional): Only present if `role == "authority"`
  - `trust_score` (number): Civic Trust points for Gamification (Phase 4)
  - `available_escalation_tokens` (number): Earned tokens to fast-track issues
  - `current_tier` (string): Rank badge (e.g. Bronze, Silver, Gold)
  - `created_at` (timestamp)

### 2.2 Collection: `issues`
The core record representing a civic problem.

- **Document ID:** Auto-generated UUID
- **Fields:**
  - `reporter_user_id` (string): Maps to `users` UID
  - `status` (string): `"pending_validation" | "open" | "in_progress" | "resolved" | "rejected" | "verified_resolved"`
  - `category` (string): Extracted by AI (e.g., "pothole", "graffiti")
  - `severity` (string): Extracted by AI (e.g., "High", "Low")
  - `location_lat` / `location_lng` (number)
  - `location_address_text` (string)
  - `description` (string)
  - `department_id` (string): Set by Router Agent
  - `assigned_worker_id` (string, optional): Set via Authority Kanban
  - `sla_deadline` (timestamp)
  - `escalation_tier_current` (number)
  - `csat_score` (number, optional): Feedback from citizen post-resolution
  - `created_at`, `updated_at`, `resolved_at`, `verified_at` (timestamps)

### 2.3 Collection: `civic_trust_events` (Phase 4)
Immutable ledger of earned trust points.

- **Document ID:** Auto-generated
- **Fields:**
  - `user_id` (string)
  - `event_type` (string): `"REPORT_VERIFIED" | "RLHF_ASSIST" | "ESCALATION_SPEND"`
  - `yield_amount` (number): Points granted
  - `timestamp` (timestamp)

### 2.4 Collection: `field_workers` (Phase 3)
Contractors and on-ground personnel for assignment.

- **Document ID:** Auto-generated
- **Fields:**
  - `department_id` (string)
  - `display_name` (string)
  - `skills` (string[])
  - `is_active` (boolean)

### 2.5 Collection: `csat_responses` (Phase 3)
Citizen feedback on resolved issues.

- **Document ID:** Auto-generated
- **Fields:**
  - `issue_id` (string)
  - `citizen_user_id` (string)
  - `rating` (number): 1-5
  - `comment` (string)
  - `created_at` (timestamp)

### 2.6 Collection: `departments`
Mapping for routing and SLA configuration.

- **Document ID:** Department ID
- **Fields:**
  - `name` (string)
  - `category_scope` (array of strings)

### 2.7 Collection: `logs` (Agent Logs)
System oversight and AI debugging.

- **Document ID:** Auto-generated
- **Fields:**
  - `agent_type` (string)
  - `issue_id` (string, optional)
  - `input_summary` (string): JSON
  - `output_summary` (string): JSON
  - `created_at` (timestamp)

---

## 3. Storage Rules & Security
- Write operations to the database are strictly mediated by the **Node.js Express Backend** using the Firebase Admin SDK.
- Frontends only read data via the API or read-only Firestore snapshots, governed by strict Firestore Security Rules protecting PII.
- Images uploaded to Cloud Storage require authentication.
