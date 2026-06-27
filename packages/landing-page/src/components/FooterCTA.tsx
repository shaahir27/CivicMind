import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

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
          <a href="http://localhost:5173" className="btn-dark-primary">
            🏙️ Start Reporting
          </a>
          <a href="http://localhost:5174" className="btn-dark-ghost">
            Official Login →
          </a>
        </div>
      </motion.div>
    </section>
  );
}
