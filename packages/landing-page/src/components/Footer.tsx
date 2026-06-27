import React from 'react';
import { CITIZEN_APP_URL, AUTHORITY_APP_URL, ADMIN_APP_URL } from '../config.js';

export default function Footer() {
  return (
    <footer className="footer-root">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">CivicSense</div>
          <p className="footer-tagline">
            An AI-powered civic reporting platform connecting citizens to their local government —
            making cities more responsive, transparent, and accountable.
          </p>
        </div>

        <div className="footer-col">
          <h4>Platform</h4>
          <ul>
            <li><a href="#how-it-works">How it Works</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href={CITIZEN_APP_URL}>Citizen App</a></li>
            <li><a href={AUTHORITY_APP_URL}>Authority Portal</a></li>
            <li><a href={ADMIN_APP_URL}>Admin Console</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Accessibility</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} CivicSense Platform. All rights reserved.</p>
        <p>Built with ❤️ to improve civic infrastructure.</p>
      </div>
    </footer>
  );
}
