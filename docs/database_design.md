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
  - `displayName` (string, optional)
  - `departmentId` (string, optional): Only present if `role == "authority"`
  - `createdAt` (timestamp)

### 2.2 Collection: `issues`
The core record representing a civic problem.

- **Document ID:** Auto-generated UUID
- **Fields:**
  - `reporterId` (string): Maps to `users` UID
  - `status` (string): `"pending_validation" | "open" | "in_progress" | "resolved" | "rejected"`
  - `category` (string): Extracted by AI (e.g., "pothole", "graffiti")
  - `severity` (string): Extracted by AI (e.g., "High", "Low")
  - `location` (GeoPoint): Latitude/Longitude
  - `address` (string): Reverse-geocoded address
  - `description` (string): AI-drafted or user-provided
  - `images` (array of strings): URLs to Cloud Storage (Before photos)
  - `resolutionImages` (array of strings): URLs to Cloud Storage (After photos)
  - `assignedDepartment` (string): Set by Router Agent
  - `escalationLevel` (number): Tracks SLA breaches (0 = initial, 1 = escalated)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
  - `resolvedAt` (timestamp, optional)
  - `resolutionNotes` (string, optional)

### 2.3 Collection: `departments`
Mapping for routing and SLA configuration.

- **Document ID:** Department Name (e.g., "dot", "sanitation")
- **Fields:**
  - `name` (string): Display name
  - `slaHours` (number): Time allowed before escalation
  - `escalationContact` (string): Email or ID of higher authority

### 2.4 Collection: `logs`
System oversight and AI debugging.

- **Document ID:** Auto-generated
- **Fields:**
  - `agent` (string): e.g., "ReporterAgent", "VerifierAgent"
  - `action` (string): Summary of event
  - `issueId` (string, optional)
  - `payload` (object): JSON dump of inputs/outputs
  - `timestamp` (timestamp)

---

## 3. Storage Rules & Security
- Write operations to the database are strictly mediated by the **Node.js Express Backend** using the Firebase Admin SDK.
- Frontends only read data via the API or read-only Firestore snapshots, governed by strict Firestore Security Rules protecting PII.
- Images uploaded to Cloud Storage require authentication.
