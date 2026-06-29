import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { CITIZEN_APP_URL } from '../config.js';

const ParticleGlobe = React.lazy(() => import('./ParticleGlobe'));

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

export default function Hero() {
  return (
    <section className="hero-section" aria-label="Hero">
      <div className="hero-bg-gradient" aria-hidden="true" />

      {/* Left: Text Content */}
      <motion.div
        className="hero-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="hero-badge" variants={itemVariants}>
          <span>🏙️</span>
          Trusted by 3 Municipal Corporations
        </motion.div>

        <motion.h1 className="hero-title" variants={itemVariants}>
          Empowering Citizens.<br />
          <span className="gradient-text">Transforming Cities.</span>
        </motion.h1>

        <motion.p className="hero-subtitle" variants={itemVariants}>
          The AI-driven civic platform that guarantees every issue is tracked, routed, and resolved. Choose your portal to begin.
        </motion.p>

        <motion.div className="hero-actions" variants={itemVariants}>
          <motion.a 
            href={CITIZEN_APP_URL} 
            className="btn-hero-primary"
            whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(229, 119, 52, 0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            Citizen Portal <span>→</span>
          </motion.a>
          <motion.a 
            href="#how-it-works" 
            className="btn-hero-secondary"
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,0,0,0.05)' }}
            whileTap={{ scale: 0.95 }}
          >
            <span>▶</span> How it Works
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Right: 3D Globe & Floating Mockups */}
      <div className="hero-3d-container" aria-hidden="true">
        <div className="hero-3d-glow" />
        <Suspense fallback={null}>
          <ParticleGlobe />
        </Suspense>

        <motion.div 
          className="floating-mockup m-top-left"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="mockup-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>✅</div>
          <div className="mockup-text">
            <strong>Pothole Resolved</strong>
            <span>10m ago • Citizen Verified</span>
          </div>
        </motion.div>

        <motion.div 
          className="floating-mockup m-bottom-right"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
        >
          <div className="mockup-icon" style={{ background: '#fff7ed', color: '#f59e0b' }}>⚠️</div>
          <div className="mockup-text">
            <strong>AI Ticket Routed</strong>
            <span>Water Dept • High Priority</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
