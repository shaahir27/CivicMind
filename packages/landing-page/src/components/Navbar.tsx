import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`nav-root ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="nav-logo">
          <span className="gradient-text">CivicSense</span>
        </div>

        <ul className="nav-links">
          <li><a href="#how-it-works">How it Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#for-officials">For Officials</a></li>
        </ul>

        <div className="nav-actions">
          <a href="http://localhost:5174" className="btn-ghost">Official Login</a>
          <a href="http://localhost:5173" className="btn-primary">
            Report an Issue <span>→</span>
          </a>
        </div>

        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 498 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="nav-mobile-drawer"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it Works</a>
              <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#for-officials" onClick={() => setMenuOpen(false)}>For Officials</a>
              <a href="http://localhost:5174" onClick={() => setMenuOpen(false)}>Official Login</a>
              <a href="http://localhost:5173" onClick={() => setMenuOpen(false)} className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                Report an Issue →
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
