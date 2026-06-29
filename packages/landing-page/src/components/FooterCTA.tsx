import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { CITIZEN_APP_URL, AUTHORITY_APP_URL, ADMIN_APP_URL } from '../config.js';

export default function FooterCTA() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="for-officials" className="footer-cta-section" ref={ref}>
      <div className="footer-cta-bg" aria-hidden="true">
        <div className="footer-blob footer-blob-1" />
        <div className="footer-blob footer-blob-2" />
        <div className="footer-blob footer-blob-3" />
      </div>

      <motion.div
        style={{ position: 'relative', zIndex: 2 }}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="section-eyebrow" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          Open Civic Data
        </p>
        <h2 className="footer-cta-title">
          Join the Transparency<br />
          <span className="gradient-text">Movement.</span>
        </h2>
        <p className="footer-cta-sub">
          Whether you are a citizen demanding change, or an official building the future — CivicSense is the bridge. Explore the platform today.
        </p>
        <div className="footer-cta-actions">
          <a href={CITIZEN_APP_URL} className="btn-dark-primary">
            Citizen Login
          </a>
          <a href={AUTHORITY_APP_URL} className="btn-dark-ghost">
            🏢 Authority Portal
          </a>
          <a href={ADMIN_APP_URL} className="btn-dark-ghost">
            ⚙️ Admin Console
          </a>
        </div>
      </motion.div>
    </section>
  );
}
