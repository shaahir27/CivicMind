# Architecture Proposal: Hyper-Local Civic Engagement & Human-in-the-Loop (HITL) RLHF
**Phase 4 Expansion: "Proof of Impact" Protocol**

As a senior engineering team, we recognize that traditional gamification (static points and generic badges) suffers from rapid user churn and vulnerability to point-farming. 

To solve this, Phase 4 of CivicSense introduces the **"Proof of Impact" (PoI) Protocol**—a dynamic, AI-driven reputation engine that deeply integrates the citizen into the city's autonomous workflow. This system converts citizens from passive reporters into active, high-trust network nodes.

---

## 1. System Design: The Dynamic Reputation Engine

Instead of a static "Karma" system, we propose a multi-dimensional user reputation model that scales dynamically based on the utility of the data provided.

### 1.1 Dynamic Civic Yield (DCY) Multiplier
Reporting a pothole on a quiet suburban street is not mathematically equivalent to reporting a live wire in a school zone. 
* **The Mechanic:** The AI **Hotspot Forecaster Agent** dynamically calculates a multiplier (DCY) for every geographic grid in the city. 
* **Implementation:** If a citizen submits a report in an area with a high AI-predicted risk index, their reputation yield is multiplied (e.g., 5x reward). This gamifies the system to organically direct citizen attention toward high-risk blind spots the city needs monitored most.

### 1.2 "Human-in-the-Loop" (HITL) Micro-Tasks
We will gamify the Reinforcement Learning from Human Feedback (RLHF) process for our AI models.
* **The Mechanic:** If the **Verifier Agent** is unsure about a fix photo submitted by a field worker (Confidence Score < 80%), the system triggers a localized broadcast to the 5 nearest citizens with a high `trust_score`.
* **Implementation:** These citizens receive a "Verification Quest". They walk to the site, snap a photo, and confirm the fix. This not only verifies the real-world infrastructure but serves as labeled training data to continuously improve our Verifier Agent's computer vision weights.

---

## 2. Advanced Engagement Mechanics & Tiered Utility

A reputation system is useless without tangible utility. High-trust citizens must unlock real administrative power.

### 2.1 The Append-Only Trust Ledger
* **Architecture:** Every citizen action (report, verify, CSAT) is written to a highly secure, append-only Event Sourcing ledger (`civic_trust_events`). 
* **Trust Decay:** To ensure continuous engagement, reputation has a half-life. If a user stops participating for 60 days, their `trust_score` slowly decays, requiring active maintenance of their neighborhood.

### 2.2 Unlockable Utility: Infrastructure Prioritization Voting
* **The Mechanic:** Citizens who reach the top 5% of the `trust_score` bracket unlock **"Escalation Tokens"**.
* **Implementation:** These tokens can be spent on the Public Transparency Portal to "upvote" a community issue. If an issue receives 3 Escalation Tokens from high-trust citizens, the system's **Escalation Agent** automatically forces an SLA override, immediately bumping the issue to the top of the Authority's Kanban board. This gives citizens direct, democratic control over municipal repair prioritization.

---

## 3. Technical Implementation Roadmap

To deploy the Proof of Impact protocol, the following architectural changes will be made to the CivicSense ecosystem:

### 3.1 Database Topology
```typescript
interface CivicTrustLedger {
  user_id: string; // Citizen UID
  event_type: 'REPORT_VERIFIED' | 'RLHF_ASSIST' | 'ESCALATION_SPEND';
  yield_amount: number; // Calculated dynamically by DCY algorithm
  geohash: string; // Location of the event for spatial queries
  timestamp: string; 
  idempotency_key: string; // Prevents double-spending/rewarding
}
```

### 3.2 Automated Fraud Prevention (The Sentinel Agent)
We will introduce the **Sentinel Agent** to run asynchronously on the `civic_trust_events` stream.
* **Vector Analysis:** The Sentinel continuously maps a user's report coordinates. If it detects physically impossible movement (e.g., a user reporting issues 5 miles apart within 60 seconds), it automatically flags the account for GPS spoofing and freezes their `trust_score`.
* **Semantic Similarity Checks:** The Sentinel cross-references the image hashes of uploaded photos to prevent users from uploading the same photo of a pothole from slightly different angles to farm reputation yield.

### 3.3 Frontend Integration
* **Radar Dashboard:** The Citizen App home screen will feature a "Radar" view, highlighting high-DCY zones (hotspots) in glowing colors, gamifying the map and encouraging users to walk to areas where the city needs data the most.
* **Reputation Ring:** A dynamic UI component around the user's avatar that visually decays or glows based on their real-time trust half-life.
