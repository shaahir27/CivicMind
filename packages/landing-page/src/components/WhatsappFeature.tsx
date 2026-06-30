import React from 'react';
import { motion } from 'framer-motion';

export default function WhatsappFeature() {
  return (
    <section className="whatsapp-section" style={{ padding: '80px 5%', textAlign: 'center', backgroundColor: '#f9fafb' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="section-eyebrow">Omnichannel Reporting</p>
        <h2 className="section-title">Report instantly via WhatsApp</h2>
        <p className="section-subtitle" style={{ maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Don't want to download another app? No problem. Add our CivicSense AI bot on WhatsApp and report issues in seconds just by sending a photo.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
          
          {/* Instructions for Jury / Users */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '800px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '200px', textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>1️⃣</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Scan & Connect</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Scan the QR code below. It will open WhatsApp with our secure sandbox code pre-filled.</p>
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '200px', textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>2️⃣</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Hit Send</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Send the pre-filled <b>join social-extra</b> message to activate your connection.</p>
            </div>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', flex: 1, minWidth: '200px', textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>3️⃣</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Report an Issue</h4>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Type "There is a broken streetlight here" and watch our AI instantly categorize it!</p>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/14155238886?text=join%20social-extra" 
              alt="WhatsApp QR Code" 
              style={{ width: '200px', height: '200px', marginBottom: '16px' }}
            />
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>Scan to test</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Scan this code with your phone's camera</p>
          </div>
          
          <a 
            href="https://wa.me/14155238886?text=join%20social-extra" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: '#25D366', 
              color: '#fff', 
              padding: '12px 24px', 
              borderRadius: '99px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>💬</span> Open WhatsApp
          </a>
        </div>
      </motion.div>
    </section>
  );
}
