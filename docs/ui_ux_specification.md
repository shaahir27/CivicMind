# CivicSense — UI/UX Specification

> This document details the final user interfaces implemented across the 4 frontend applications.

---

## 1. Design System
- **Framework:** Custom CSS with CSS Variables for theme consistency, avoiding utility-class bloat.
- **Typography:** Google Fonts (`Playfair Display` for bold premium headings, `Plus Jakarta Sans` for clean body text).
- **Colors (Unified Earthy Palette):**
  - Backgrounds: Warm Cream (`#FBEBCF` / `var(--color-bg-primary)`)
  - Primary Actions/Accents: Vibrant Orange (`#E57734` / `var(--color-brand-500)`)
  - Structural/Secondary: Deep Teal (`#01757A` / `var(--color-brand-700)`)
- **Animations:** Framer Motion for smooth page transitions, staggered entry, and fluid hover physics.

---

## 2. Landing Page (`packages/landing-page`)
**Target Audience:** Everyone (Citizens, Officials, Judges).
**Key Elements:**
- **Hero:** Dense, slowly rotating 3D particle globe (Deep Teal & Vibrant Orange particles) with a soft glowing core, flanked by floating mockups demonstrating real-time AI capabilities.
- **The Dual Ecosystem:** Asymmetric layout clearly defining the value for Citizens vs. Authorities.
- **Transparency Portal:** Real-time data visualization showing system-wide statistics (resolved issues, active workers).
- **Navigation:** Explicit calls to action ("Citizen Login", "Official Login").

---

## 3. Citizen App (`packages/citizen-app`)
**Target Audience:** General public.
**Form Factor:** Mobile-first PWA.
**Key Elements:**
- **Map View:** Google Maps view showing recent issues in the neighborhood.
- **Camera FAB:** Large floating action button to instantly report a problem.
- **Timeline View:** A clean, vertical timeline showing exactly what stage the issue is in (e.g., "Routed to Sanitation") with an embedded Messaging thread for updates.
- **Profile Dashboard:** A gamified reputation hub displaying the citizen's Civic Trust score, current rank tier (Bronze/Silver/Gold), and recent proof-of-impact activity.

---

## 4. Authority Portal (`packages/authority-portal`)
**Target Audience:** Municipal workers.
**Form Factor:** Desktop-first dashboard.
**Key Elements:**
- **Sidebar Navigation:** Kanban Queue, Resolved, Map.
- **Kanban Issue Queue:** Visual, drag-and-drop or categorized board for moving issues between states (Open → Assigned → In Progress).
- **Detail View:** Side-by-side comparison of the citizen's photo and the AI's extracted metadata, including an integrated chat interface for contacting citizens.
- **Resolution Modal:** Upload prompt for the "after" photo to pass to the Verifier Agent.

---

## 5. Admin Console (`packages/admin-console`)
**Target Audience:** System Administrators.
**Form Factor:** Desktop-first dashboard.
**Key Elements:**
- **Global Overview:** KPI cards (Total Issues, AI Accuracy, SLA Breaches).
- **Agent Logs Table:** Raw JSON payload viewer for debugging Gemini responses.
- **User Management:** Table to assign departments to registered Authority accounts.
