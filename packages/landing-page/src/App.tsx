import React from 'react';
import './index.css';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StatsBar from './components/StatsBar';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import FooterCTA from './components/FooterCTA';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="landing-root">
      <Navbar />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <FooterCTA />
      <Footer />
    </div>
  );
}
