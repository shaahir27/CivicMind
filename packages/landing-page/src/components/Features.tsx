import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function Features() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="ecosystem-section" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="section-eyebrow">The Civic Platform</p>
        <h2 className="section-title">One Platform.<br />Two Powerful Experiences.</h2>
        <p className="section-subtitle">
          Designed specifically for both ends of the civic process. No compromises.
        </p>
      </motion.div>

      <div className="ecosystem-grid">
        {/* Block A: Citizen */}
        <motion.div
          className="eco-card citizen-card"
          initial={{ opacity: 0, x: -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="eco-header">
            <h3>For Citizens</h3>
            <span className="eco-badge">Report & Track</span>
          </div>
          <h2>Your direct line to city hall.</h2>
          <p className="eco-desc">Hold your city accountable with a few taps. CivicSense handles the bureaucracy so you don't have to.</p>
          <ul className="eco-features-list">
            <li><span>⚡</span> Report any issue in under 30 seconds</li>
            <li><span>🤖</span> AI automatically categorizes your photo</li>
            <li><span>📍</span> Live tracking from submission to resolution</li>
            <li><span>🛡️</span> You hold the power: verify fixes before closure</li>
          </ul>
        </motion.div>

        {/* Block B: Official */}
        <motion.div
          className="eco-card official-card"
          initial={{ opacity: 0, x: 30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="eco-header">
            <h3>For Authorities</h3>
            <span className="eco-badge">Manage & Resolve</span>
          </div>
          <h2>Command your infrastructure.</h2>
          <p className="eco-desc">Empower your workforce with AI triage and real-time dashboards that eliminate duplicate tickets.</p>
          <ul className="eco-features-list">
            <li><span>🧠</span> Smart AI routing to the exact department</li>
            <li><span>📊</span> Real-time predictive heatmap dashboards</li>
            <li><span>⏱️</span> Automated SLA tracking and escalation</li>
            <li><span>🔍</span> AI-powered duplicate ticket clustering</li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
