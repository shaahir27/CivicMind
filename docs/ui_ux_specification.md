# CivicSense — UI/UX Specification

> This document details the final user interfaces implemented across the 4 frontend applications.

---

## 1. Design System
- **Framework:** Custom CSS with CSS Variables for theme consistency, avoiding utility-class bloat.
- **Typography:** Google Fonts ('Outfit' for bold headings, 'Inter' for body).
- **Colors:**
  - Citizen Theme: Emerald Green (`#10b981`)
  - Authority Theme: Ocean Blue (`#3b82f6`)
  - Admin Theme: Slate/Purple (`#6366f1`)
  - Shared: Neutral grays, true white, off-white backgrounds for contrast.
- **Animations:** Framer Motion for smooth page transitions, stagger effects, and list pop-ins.

---

## 2. Landing Page (`packages/landing-page`)
**Target Audience:** Everyone (Citizens, Officials, Judges).
**Key Elements:**
- **Hero:** 3D glowing globe with "glass-morphism" floating mockups demonstrating real-time AI capabilities.
- **The Dual Ecosystem:** Asymmetric layout clearly defining the value for Citizens vs. Authorities.
- **Navigation:** Explicit calls to action ("Citizen Login", "Official Login").

---

## 3. Citizen App (`packages/citizen-app`)
**Target Audience:** General public.
**Form Factor:** Mobile-first PWA.
**Key Elements:**
- **Map View:** Leaflet map showing recent issues in the neighborhood.
- **Camera FAB:** Large floating action button to instantly report a problem.
- **Upload Flow:** Stripped down to minimize friction. User selects a photo, and the AI handles the rest.
- **Timeline View:** A clean, vertical timeline showing exactly what stage the issue is in (e.g., "Routed to Sanitation").

---

## 4. Authority Portal (`packages/authority-portal`)
**Target Audience:** Municipal workers.
**Form Factor:** Desktop-first dashboard.
**Key Elements:**
- **Sidebar Navigation:** Queue, Resolved, Map.
- **Issue Queue:** Data table with sortable columns (Severity, SLA Time Remaining, Category).
- **Detail View:** Side-by-side comparison of the citizen's photo and the AI's extracted metadata.
- **Resolution Modal:** Upload prompt for the "after" photo to pass to the Verifier Agent.

---

## 5. Admin Console (`packages/admin-console`)
**Target Audience:** System Administrators.
**Form Factor:** Desktop-first dashboard.
**Key Elements:**
- **Global Overview:** KPI cards (Total Issues, AI Accuracy, SLA Breaches).
- **Agent Logs Table:** Raw JSON payload viewer for debugging OpenRouter/Gemini responses.
- **User Management:** Table to assign departments to registered Authority accounts.
