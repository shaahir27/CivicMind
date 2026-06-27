/**
 * Onboarding Screen — ui_ux_specification.md §2.1, §2.2
 * 3-panel swipeable explainer + Guest/Account choice.
 * Uses i18n (NFR-5) — supports English and Tamil.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext.js';

export default function OnboardingScreen() {
  const [panel, setPanel] = useState(0);
  const navigate = useNavigate();
  const { t, locale, setLocale } = useI18n();

  const PANELS = [
    {
      icon: '📸',
      title: t('onboarding1Title'),
      sub: t('onboarding1Sub'),
      bg: 'linear-gradient(135deg, hsl(220 100% 97%), hsl(210 100% 93%))',
    },
    {
      icon: '🤖',
      title: t('onboarding2Title'),
      sub: t('onboarding2Sub'),
      bg: 'linear-gradient(135deg, hsl(260 100% 97%), hsl(240 100% 93%))',
    },
    {
      icon: '✅',
      title: t('onboarding3Title'),
      sub: t('onboarding3Sub'),
      bg: 'linear-gradient(135deg, hsl(150 80% 97%), hsl(165 80% 93%))',
    },
  ];

  const next = () => {
    if (panel < PANELS.length - 1) setPanel(panel + 1);
    else navigate('/auth');
  };

  const skip = () => navigate('/auth');

  const p = PANELS[panel]!;

  return (
    <div style={{ height: '100dvh', background: p.bg, display: 'flex', flexDirection: 'column', transition: 'background 0.4s ease' }}>
      {/* Top bar: Skip + Language toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <button
          onClick={() => setLocale(locale === 'en' ? 'ta' : 'en')}
          style={{
            background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '20px', padding: '6px 14px', cursor: 'pointer',
            fontSize: '12px', fontWeight: 600, color: '#1e293b', fontFamily: 'var(--font-sans)',
          }}
        >
          🌐 {t('switchLanguage')}
        </button>
        <button
          onClick={skip}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        >
          {t('skip')}
        </button>
      </div>

      {/* Content */}
      <div
        className="onboarding-panel"
        style={{ flex: 1, justifyContent: 'center', gap: '24px', padding: '0 32px' }}
        key={panel}
      >
        <div className="onboarding-illustration">{p.icon}</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.25 }}>{p.title}</h1>
        <p style={{ fontSize: '16px', color: '#475569', lineHeight: 1.7, maxWidth: '320px' }}>{p.sub}</p>
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '24px 32px 40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="progress-dots">
          {PANELS.map((_, i) => (
            <button
              key={i}
              className={`progress-dot ${i === panel ? 'active' : ''}`}
              onClick={() => setPanel(i)}
              style={{ cursor: 'pointer', border: 'none' }}
            />
          ))}
        </div>
        <button
          className="btn-primary"
          onClick={next}
          style={{ fontSize: '16px' }}
        >
          {panel < PANELS.length - 1 ? t('continue') : t('getStarted')}
        </button>
      </div>
    </div>
  );
}
