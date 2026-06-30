# CivicSense AI — Complete Architecture & Feature Report

This document outlines the complete architectural lifecycle of CivicSense, detailing the features implemented from Phase 1 (Foundation) through Phase 2 (AI Multi-Agent Orchestration) and our Phase 3 Innovation Additions. 

Every feature listed here is **actively running in the codebase** and designed to scale as a production-grade 311 municipal platform.

---

## 🔄 End-to-End System Flow: The Lifecycle of a Civic Issue

To understand CivicSense, here is exactly how the system processes a real-world issue (e.g., a broken streetlight) from the moment it is reported to the moment the public sees the analytics.

### Step 1: Omnichannel Citizen Intake
A citizen spots a broken streetlight. They have two completely frictionless ways to report it:
1. **The Citizen App:** They open the CivicSense PWA, snap a photo, and hit submit. The app automatically captures their exact GPS coordinates.
2. **WhatsApp Bot (No App Required):** The citizen simply opens WhatsApp, texts the CivicSense Twilio Bot a photo of the streetlight and says, "Broken light at Main St."

### Step 2: The Multi-Agent AI Triage Pipeline
Before a human authority even sees the ticket, our multi-agent AI pipeline processes it in milliseconds.
1. **The Reporter Agent:** Analyzes the photo and text using Google Gemini. It determines the issue `category` (Electrical/Lighting) and assigns a `severity` (e.g., High, if the street is completely dark).
2. **The Validator Agent:** Checks the report for validity and cross-references it with existing database tickets using geospatial proximity. If someone else reported this exact streetlight 10 minutes ago, it flags the new report as a `duplicate`, preventing the authority queue from being spammed.
3. **The Router Agent:** Based on the `category` and `location`, it intelligently routes the ticket directly to the "Department of Public Works (Electrical Division)" for that specific ward.

### Step 3: Authority Operations & Work Order Assignment
The ticket appears instantly on the **Authority Portal**. 
* The supervisor opens the **My Team Kanban Board**.
* They see the new "High Severity" ticket and drag-and-drop it into the column of an active field worker. 
* The field worker receives the assignment and drives to the location.

### Step 4: AI-Verified Resolution
The field worker fixes the light, takes a photo of the working light, and submits it through the app.
* **The Verifier Agent:** Instead of blindly trusting the worker, this agent compares the original "broken" photo with the newly submitted "fixed" photo. If it visually confirms the light is repaired, it permanently marks the ticket as `verified_resolved`.

### Step 5: Post-Resolution & Public Accountability
The loop is closed with the citizen and the public.
* **Citizen Satisfaction (CSAT):** The citizen receives a notification that their issue is fixed and is prompted to leave a 1-5 star rating. 
* **The Transparency Portal:** The fix is instantly reflected on the public `/transparency` dashboard. The Ward's resolution stats update in real-time.
* **The Ward Leaderboard:** At midnight, the automated cron job calculates the new "Civic Health Score" for the ward (factoring in this fast resolution and the positive CSAT score) and ranks the ward against the rest of the city.

---

## 🧠 Technical Deep-Dive: AI Agents & Background Monitors

CivicSense removes human bottlenecks by running continuous background processes. 

### 1. The Autonomous Triage Pipeline
* **Reporter, Validator, & Router Agents:** These agents run sequentially in a single orchestrator function upon ticket submission. 
* **Agent Decision Log:** To maintain absolute accountability, every decision made by these agents is logged into a dedicated `agent_decision_log` collection. The log records the `confidence_score` and the AI's exact `reasoning` (e.g., *"Assigned severity HIGH because exposed wires are visible in the photo."*).

### 2. Automated Background Jobs (Cron)
* **Escalation Agent (15-Min Interval):** Continuously sweeps the database for unresolved issues. If a "Critical" issue breaches its Service Level Agreement (SLA) deadline, the agent automatically escalates its priority and generates supervisor alerts.
* **Agent Anomaly Monitor (Daily):** Tracks the average confidence scores of all AI agents over a 7-day rolling window. If an agent's confidence drops (e.g., poor image quality from a new phone update is confusing the Verifier Agent), it generates an `agent_health_alert` for the admins.
* **Predictive Hotspot Forecaster:** Uses historical clustering to predict where infrastructure failures (like recurring flooding or potholes) are likely to happen next, transitioning the city from reactive to proactive maintenance.

---

## 🛠️ Phase 3: Innovation & Administrative Features (Deep Dive)

To push CivicSense from a standard "reporting app" to an enterprise-grade Civic Operations Platform, we implemented several advanced features. Below is an exhaustive technical breakdown of every feature added to the ecosystem.

### A. Advanced Authority Operations

#### A1. Work Order & Crew Assignment (The Kanban Board)
* **The Problem:** Standard 311 systems treat "The Authority" as a single entity, meaning tickets pile up in a shared inbox without individual accountability.
* **How it works:** We built a complete Field Operations module. In the database, we introduced a `field_workers` collection representing individual municipal employees (with specific skills and workload limits). On the frontend, we built the `MyTeamScreen`—a drag-and-drop Kanban board for supervisors. 
* **Technical Flow:** When a supervisor drags a ticket into a field worker's column, a `POST /api/v1/authority/issues/:id/assign` request fires. This updates the `assigned_worker_id` on the issue document without disrupting the core `IssueStatus` state machine. The field worker can now log into their mobile-optimized view and see their specific route for the day.

#### A5. Authority Performance Scorecard
* **The Problem:** City administrators have no way to measure if the Department of Water is performing better or worse than the Department of Roads.
* **How it works:** We implemented a real-time analytics dashboard (`SlaComplianceScreen`) that tracks Service Level Agreement (SLA) compliance.
* **Technical Flow:** The backend aggregation endpoint (`GET /api/v1/authority/performance-summary`) dynamically queries the `issues` collection and the `agent_decision_log`. It calculates:
  1. **Average Time-to-Acknowledge:** Time from submission to the authority marking it "In Progress".
  2. **Average Time-to-Resolve:** Time from "In Progress" to "Resolved".
  3. **First-Time Verification Rate:** How often the Verifier AI approves a fix photo on the first try versus how often it rejects sloppy repair work.

### B. Public Transparency & Omnichannel Intake

#### B1. Natural-Language Admin Copilot ("Ask CivicSense")
* **The Problem:** Extracting actionable insights from a database (e.g., "Which ward had the highest duplicate ticket rate last month?") usually requires a data scientist writing SQL.
* **How it works:** We integrated a conversational AI Copilot directly into the Admin Console.
* **Technical Flow:** When an admin types a question, the `CopilotAgent` intercepts the natural language prompt. It is strictly constrained to prevent arbitrary writes; instead, it dynamically constructs Firestore queries against the `issues` and `agent_decision_log` collections. It retrieves the JSON dataset and passes it back to Google Gemini, which synthesizes the raw data into a highly readable, plain-language executive summary.

#### B2. Automated Ward Leaderboards & Civic Health Score
* **The Problem:** Civic engagement drops when citizens feel their reports go into a black hole.
* **How it works:** We gamified civic infrastructure. Every ward in the city is assigned a "Civic Health Score".
* **Technical Flow:** A Node.js cron job runs every night at midnight (`0 0 * * *`). It loops through every ward's jurisdiction and evaluates the trailing 30 days of data. The algorithm weighs the number of issues reported, the average resolution speed, and citizen CSAT ratings. The results are cached and surfaced on the `LeaderboardScreen`, creating healthy competition between municipal districts.

#### B3. Public Transparency Portal
* **The Problem:** Dashboards are usually locked behind admin firewalls. True civic trust requires open data.
* **How it works:** We built a dedicated, unauthenticated route (`/transparency`) within the Citizen Landing Page. 
* **Technical Flow:** This portal utilizes specialized backend routes (`GET /api/v1/map/impact-reports` and `GET /api/v1/map/hotspot-forecasts`) designed to aggregate data *without* returning personally identifiable information (PII). Citizens can view live city-wide resolution statistics, the Ward Leaderboard rankings, and the AI-generated Hotspot Forecasts on a public map.

#### B4. Citizen Satisfaction Survey (CSAT) Post-Resolution
* **The Problem:** A pothole can be marked "fixed" by the AI, but the repair might be of poor quality. The citizen's voice is lost.
* **How it works:** We closed the feedback loop by introducing CSAT ratings.
* **Technical Flow:** When an issue enters the `verified_resolved` state, the citizen's app updates to show a "Rate this resolution" prompt. When they submit a 1-5 star rating, it writes to a new `csat_responses` collection. This human feedback is directly injected as a weighted variable into the automated nightly Civic Health Score algorithm.

#### B5. Agent Anomaly Monitoring
* **The Problem:** If an AI agent's performance degrades (e.g., a prompt injection attack or unexpected data shifts), the system needs to self-diagnose before causing havoc.
* **How it works:** An automated oversight system that watches the AI.
* **Technical Flow:** A cron job runs daily at 01:00 AM (`0 1 * * *`). It scans the `agent_decision_log` and calculates the 7-day rolling average of the `confidence_score` for every agent type (Reporter, Router, Verifier). If an agent's average confidence drops more than 15% below its historic baseline, the system generates an `agent_health_alert` in the database, surfacing a warning directly on the Admin Dashboard.

#### B6. Omnichannel Reporting via WhatsApp
* **The Problem:** Requiring citizens to download a dedicated government app creates a massive friction barrier, especially in low-income or rural demographics.
* **How it works:** Citizens can report issues using the app they already have: WhatsApp.
* **Technical Flow:** We created an integration with the Twilio WhatsApp Business API. The backend exposes a secure webhook (`POST /api/v1/channels/whatsapp/inbound`). When a citizen sends a photo via WhatsApp:
  1. The webhook intercepts the incoming Twilio payload.
  2. It extracts the Base64 image and text description.
  3. It maps this data directly into the exact same `orchestrateIssueSubmission` pipeline used by the Web App.
  4. The AI Reporter Agent analyzes it, creates the ticket in Firestore, and the webhook responds to the citizen via WhatsApp TwiML (XML) with an instant status update.
  5. **User Acquisition:** We embedded a dynamic QR code directly on the public Landing Page. A user simply scans the QR code with their camera, and their WhatsApp opens automatically with a pre-filled secure connection string (`join social-extra`), instantly onboarding them to the platform.
