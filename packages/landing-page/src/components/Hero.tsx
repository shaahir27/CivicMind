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
          Your City,<br />
          <span className="gradient-text">Finally Heard.</span>
        </motion.h1>

        <motion.p className="hero-subtitle" variants={itemVariants}>
          CivicSense gives citizens a direct voice. AI-powered issue reporting,
          tracked from submission to resolution — with full transparency.
        </motion.p>

        <motion.div className="hero-actions" variants={itemVariants}>
          <a href={CITIZEN_APP_URL} className="btn-hero-primary">
            Start Reporting <span>→</span>
          </a>
          <a href="#how-it-works" className="btn-hero-secondary">
            <span>▶</span> How it Works
          </a>
        </motion.div>
      </motion.div>

      {/* Right: 3D Globe */}
      <div className="hero-3d-container" aria-hidden="true">
        <div className="hero-3d-glow" />
        <Suspense fallback={null}>
          <ParticleGlobe />
        </Suspense>
      </div>
    </section>
  );
}
