import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion';

const STATS = [
  { value: 12400, suffix: '+', label: 'Issues Reported' },
  { value: 89,    suffix: '%', label: 'Resolution Rate' },
  { value: 48,    suffix: 'h', label: 'Avg. Resolution Time' },
  { value: 3,     suffix: '',  label: 'Cities Active' },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const count = useMotionValue(0);
  const smoothCount = useSpring(count, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) {
      const controls = animate(count, value, { duration: 2, ease: 'easeOut' });
      return controls.stop;
    }
  }, [inView, count, value]);

  useEffect(() => {
    return smoothCount.on('change', v => setDisplay(Math.round(v)));
  }, [smoothCount]);

  return (
    <span ref={ref}>
      <span className="gradient-text">
        {value >= 1000 ? display.toLocaleString() : display}
        {suffix}
      </span>
    </span>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      className="stats-bar"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="stats-grid">
        {STATS.map((stat, idx) => (
          <React.Fragment key={stat.label}>
            <motion.div
              className="stat-item"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: idx * 0.12 }}
            >
              <div className="stat-number">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
            {idx < STATS.length - 1 && <div className="stat-divider" aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>
    </motion.section>
  );
}
