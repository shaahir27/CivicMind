import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIZEN_APP_URL, AUTHORITY_APP_URL, ADMIN_APP_URL } from '../config.js';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const location = useLocation();

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
          <Link to="/" className="gradient-text" style={{ textDecoration: 'none' }}>CivicSense</Link>
        </div>

        <ul className="nav-links">
          {location.pathname === '/' ? (
            <>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="#features">Features</a></li>
            </>
          ) : (
            <li><Link to="/">Home</Link></li>
          )}
          <li><Link to="/transparency" style={{ color: 'var(--color-brand-500)', fontWeight: 600 }}>Transparency</Link></li>
        </ul>

        <div className="nav-actions">
          <div 
            className="dropdown-container" 
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
            style={{ position: 'relative' }}
          >
            <button className="btn-ghost" style={{ cursor: 'pointer' }}>Official Login ▾</button>
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    background: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '220px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.05)',
                    zIndex: 1000
                  }}
                >
                  <a 
                    href={AUTHORITY_APP_URL} 
                    style={{ padding: '14px 16px', color: '#333', textDecoration: 'none', borderBottom: '1px solid #f0f0f0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🏢</span> Authority Portal
                  </a>
                  <a 
                    href={ADMIN_APP_URL} 
                    style={{ padding: '14px 16px', color: '#333', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '1.2rem' }}>⚙️</span> Admin Console
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <a href={CITIZEN_APP_URL} className="btn-primary">
            Citizen Login <span>→</span>
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
              {location.pathname === '/' && (
                <>
                  <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it Works</a>
                  <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
                </>
              )}
              {location.pathname !== '/' && (
                <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
              )}
              <Link to="/transparency" onClick={() => setMenuOpen(false)} style={{ color: 'var(--color-brand-500)', fontWeight: 600 }}>Transparency Portal</Link>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Official Access</span>
                <a href={AUTHORITY_APP_URL} onClick={() => setMenuOpen(false)}>🏢 Authority Portal</a>
                <a href={ADMIN_APP_URL} onClick={() => setMenuOpen(false)}>⚙️ Admin Console</a>
              </div>
              <a href={CITIZEN_APP_URL} onClick={() => setMenuOpen(false)} className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
                Citizen Login →
              </a>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
