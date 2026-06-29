import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const STEPS = [
  {
    icon: '📸',
    num: '01',
    title: 'Snap & Report',
    desc: 'Take a photo of any civic issue — a pothole, broken streetlight, or overflowing drain. Add a location, and you\'re done.',
  },
  {
    icon: '🤖',
    num: '02',
    title: 'AI Classifies',
    desc: 'Our AI reads your photo and automatically detects the issue type, severity level, and routes it to the right department.',
  },
  {
    icon: '✅',
    num: '03',
    title: 'Track to Resolution',
    desc: 'Watch your report move through the pipeline in real time. Get notified when the city fixes it — and verify the outcome.',
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="how-section" ref={ref}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <p className="section-eyebrow">The Process</p>
        <h2 className="section-title">From Broken to Fixed<br />in 3 Simple Steps</h2>
        <p className="section-subtitle">
          No forms, no bureaucracy. Just a photo and a tap — CivicSense handles the rest.
        </p>
      </motion.div>

      <div className="steps-container">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.num}>
            <motion.div
              className="step-card"
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(0,0,0,0.06)' }}
              transition={{ duration: 0.6, delay: 0.2 + idx * 0.15 }}
            >
              <div className="step-icon-wrap">
                <span style={{ fontSize: '1.8rem' }}>{step.icon}</span>
                <span className="step-number">{step.num}</span>
              </div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.desc}</div>
            </motion.div>
            {idx < STEPS.length - 1 && (
              <motion.div
                className="step-connector"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={inView ? { scaleX: 1, opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
