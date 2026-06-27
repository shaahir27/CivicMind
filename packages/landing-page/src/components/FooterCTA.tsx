import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { CITIZEN_APP_URL, AUTHORITY_APP_URL, ADMIN_APP_URL } from '../config.js';

export default function FooterCTA() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="for-officials" className="footer-cta-section" ref={ref}>
      <div className="footer-cta-bg" aria-hidden="true" />

      <motion.div
        style={{ position: 'relative', zIndex: 2 }}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="section-eyebrow" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          Ready to Begin?
        </p>
        <h2 className="footer-cta-title">
          Your city needs<br />
          <span className="gradient-text">you to speak up.</span>
        </h2>
        <p className="footer-cta-sub">
          Join thousands of citizens already using CivicSense to hold their city accountable.
          It takes 30 seconds to file your first report.
        </p>
        <div className="footer-cta-actions">
          <a href={CITIZEN_APP_URL} className="btn-dark-primary">
            🏙️ Start Reporting
          </a>
          <a href={AUTHORITY_APP_URL} className="btn-dark-ghost">
            🏢 Authority Portal →
          </a>
          <a href={ADMIN_APP_URL} className="btn-dark-ghost">
            ⚙️ Admin Console →
          </a>
        </div>
      </motion.div>
    </section>
  );
}
