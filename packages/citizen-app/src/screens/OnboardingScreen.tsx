/**
 * Onboarding Screen — ui_ux_specification.md §2.1, §2.2
 * 3-panel swipeable explainer + Guest/Account choice.
 * Uses i18n (NFR-5) — supports English and Tamil.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n, SUPPORTED_LANGUAGES } from '../context/I18nContext.js';

export default function OnboardingScreen() {
  const [panel, setPanel] = useState(0);
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();

  const PANELS = [
    {
      icon: '📸',
      title: t('onboarding1Title'),
      sub: t('onboarding1Sub'),
      accent: 'var(--gradient-brand)',
      blobColor: 'rgba(226, 113, 12, 0.15)',
    },
    {
      icon: '🤖',
      title: t('onboarding2Title'),
      sub: t('onboarding2Sub'),
      accent: 'linear-gradient(135deg, #499A9F 0%, #0E6B73 100%)',
      blobColor: 'rgba(73, 154, 159, 0.15)',
    },
    {
      icon: '✅',
      title: t('onboarding3Title'),
      sub: t('onboarding3Sub'),
      accent: 'linear-gradient(135deg, #E2710C 0%, #B05008 100%)',
      blobColor: 'rgba(226, 113, 12, 0.15)',
    },
  ];

  const next = () => {
    if (panel < PANELS.length - 1) setPanel(panel + 1);
    else navigate('/auth');
  };

  const skip = () => navigate('/auth');

  const p = PANELS[panel]!;

  return (
    <div style={{ 
      height: '100dvh', 
      background: 'var(--color-bg-primary)',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Background Animated Blobs */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-15%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: p.blobColor,
        filter: 'blur(80px)',
        transition: 'all 0.8s ease',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-20%',
        width: '70vw',
        height: '70vw',
        borderRadius: '50%',
        background: p.blobColor,
        filter: 'blur(100px)',
        transition: 'all 0.8s ease',
        zIndex: 0
      }} />

      {/* Top bar: Language + Skip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', zIndex: 10 }}>
        {/* Language Switcher */}
        <div style={{ position: 'relative' }}>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            style={{
              appearance: 'none', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 0, 0, 0.05)', borderRadius: '24px',
              padding: '8px 16px 8px 36px', fontSize: '13px', fontWeight: 600, color: 'hsl(220 20% 25%)',
              cursor: 'pointer', outline: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', fontFamily: 'var(--font-sans)'
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '16px' }}>🌐</span>
        </div>
        
        <button
          onClick={skip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-brand-500)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
        >
          {t('skip')}
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 32px', zIndex: 10, position: 'relative' }}>
        
        {/* Dynamic Card Container */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '32px',
          padding: '40px 24px',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
          transform: 'translateY(0)',
          animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Icon with animated gradient ring */}
          <div style={{ position: 'relative', marginBottom: '32px' }}>
            <div style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              background: p.accent,
              opacity: 0.2,
              filter: 'blur(15px)',
              animation: 'pulse 3s infinite alternate',
            }} />
            <div style={{
              width: '96px',
              height: '96px',
              background: 'linear-gradient(145deg, rgba(255,255,255,1), rgba(255,255,255,0.6))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              border: '1px solid rgba(0,0,0,0.05)',
              position: 'relative',
              zIndex: 2,
              boxShadow: 'inset 0 4px 10px rgba(255,255,255,0.8), 0 10px 20px rgba(0,0,0,0.05)',
            }}>
              {p.icon}
            </div>
          </div>

          <h1 style={{ 
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 8vw, 2.8rem)', 
            fontWeight: 900, 
            letterSpacing: '-0.02em',
            marginBottom: '16px',
            lineHeight: 1.15,
            wordBreak: 'break-word',
            color: 'var(--color-brand-600)',
          }}>
            {p.title}
          </h1>
          
          <p style={{ 
            fontSize: 'clamp(0.95rem, 4vw, 1.1rem)', 
            color: 'var(--color-text-secondary)', 
            lineHeight: 1.6,
            fontWeight: 400,
            wordBreak: 'break-word',
          }}>
            {p.sub}
          </p>
        </div>
      </div>

      {/* Bottom Controls */}
      <div style={{ padding: '32px 32px 48px', display: 'flex', flexDirection: 'column', gap: '32px', zIndex: 10 }}>
        
        {/* Pagination Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {PANELS.map((_, i) => (
            <button
              key={i}
              onClick={() => setPanel(i)}
              style={{ 
                width: i === panel ? '32px' : '8px', 
                height: '8px',
                borderRadius: '4px',
                background: i === panel ? p.accent : 'rgba(0, 0, 0, 0.1)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0,
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Primary Action Button */}
        <button
          onClick={next}
          style={{
            background: p.accent,
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            padding: '18px 24px',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.2s, filter 0.2s',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {panel < PANELS.length - 1 ? t('continue') : t('getStarted')}
        </button>
      </div>
      
      {/* Required CSS Animations */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.2; }
          100% { transform: scale(1.15); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
