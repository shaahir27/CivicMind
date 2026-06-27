import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const FEATURES = [
  {
    icon: '🤖',
    title: 'AI-Powered Detection',
    desc: 'Auto-classify photos into 9 issue types with AI-scored severity — no manual tagging needed.',
  },
  {
    icon: '📍',
    title: 'Live City Map',
    desc: 'Browse all reported issues on an interactive map. See what\'s being fixed in your neighbourhood.',
  },
  {
    icon: '⏱️',
    title: 'SLA Enforcement',
    desc: 'Every issue gets a resolution deadline. Overdue issues are automatically escalated to senior officials.',
  },
  {
    icon: '🛡️',
    title: 'Citizen Verification',
    desc: 'Issues are only marked resolved when the reporting citizen confirms the fix is complete.',
  },
  {
    icon: '📊',
    title: 'Hotspot Forecasting',
    desc: 'Our predictive model identifies where infrastructure problems will emerge next — before they happen.',
  },
  {
    icon: '🔔',
    title: 'Real-Time Alerts',
    desc: 'Get push notifications at every step — submission, routing, progress, and resolution.',
  },
];

export default function Features() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="features-section" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="section-eyebrow">Platform Features</p>
        <h2 className="section-title">Built for Every Part<br />of the City Lifecycle</h2>
        <p className="section-subtitle">
          From the moment you spot a problem to the day it's fixed — CivicSense is with you every step.
        </p>
      </motion.div>

      <div className="features-grid">
        {FEATURES.map((feature, idx) => (
          <motion.div
            key={idx}
            className="feature-card"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 + idx * 0.08 }}
          >
            <div className="feature-icon-box">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
