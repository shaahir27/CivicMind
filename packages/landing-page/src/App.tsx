import React from 'react';
import './index.css';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StatsBar from './components/StatsBar';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import FooterCTA from './components/FooterCTA';
import Footer from './components/Footer';
import TransparencyPortal from './components/TransparencyPortal';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import WhatsappFeature from './components/WhatsappFeature';

function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <WhatsappFeature />
      <FooterCTA />
    </>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="landing-root">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/transparency" element={<TransparencyPortal />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}
