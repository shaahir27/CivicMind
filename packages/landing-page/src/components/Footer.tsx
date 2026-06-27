import React from 'react';

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
            <li><a href="http://localhost:5173">Citizen App</a></li>
            <li><a href="http://localhost:5174">Authority Portal</a></li>
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
