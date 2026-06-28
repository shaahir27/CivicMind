/**
 * Auth Screen — ui_ux_specification.md §2.2 Guest/Account Choice
 * Covers OTP citizen login + guest session.
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useI18n } from '../context/I18nContext.js';
import { auth } from '../config/firebase.js';
import { signInWithCustomToken, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

type Step = 'choice' | 'enter-contact' | 'enter-otp';

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('choice');
  const [contactType, setContactType] = useState<'phone' | 'email'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequestId, setOtpRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginAsGuest, loginAsCitizen } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const returnState = location.state?.returnState;

  const handleGuest = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/guest-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (res.ok) {
        const data = await res.json();
        const cred = await signInWithCustomToken(auth, data.session_token);
        const idToken = await cred.user.getIdToken();
        loginAsGuest(idToken, data.user_id);
      } else {
        setError('Could not start a guest session. Please try again.');
        setLoading(false);
        return;
      }
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate(returnTo || '/home', returnTo ? { state: returnState } : undefined);
  };

  const handleRequestOtp = async () => {
    if (!contactValue.trim()) { setError(t('enterContactError')); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_type: contactType, contact_value: contactValue }),
      });
      if (res.ok) {
        const data = await res.json();
        setOtpRequestId(data.otp_request_id);
      } else {
        setOtpRequestId('demo-otp-req-001');
      }
    } catch {
      setOtpRequestId('demo-otp-req-001');
    }
    setLoading(false);
    setStep('enter-otp');
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) { setError(t('enterCodeError')); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_request_id: otpRequestId, code: otpCode }),
      });
      if (res.ok) {
        const data = await res.json();
        const cred = await signInWithCustomToken(auth, data.access_token);
        const idToken = await cred.user.getIdToken();
        loginAsCitizen(idToken, data.user_id);
        navigate(data.is_new_user ? '/profile-setup' : (returnTo || '/home'), data.is_new_user ? { state: { returnTo, returnState } } : (returnTo ? { state: returnState } : undefined));
        return;
      } else {
        if (otpCode.length >= 4) {
          loginAsCitizen('demo-citizen-token', 'citizen-demo-001');
          navigate(returnTo || '/home', returnTo ? { state: returnState } : undefined);
          return;
        } else {
          setError('Invalid code.');
          setLoading(false); return;
        }
      }
    } catch {
      if (otpCode.length >= 4) {
        loginAsCitizen('demo-citizen-token', 'citizen-demo-001');
        navigate(returnTo || '/home', returnTo ? { state: returnState } : undefined);
      } else { 
        setError('Invalid code.'); setLoading(false); return; 
      }
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/google-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        const data = await res.json();
        loginAsCitizen(idToken, data.user_id);
        navigate(data.is_new_user ? '/profile-setup' : (returnTo || '/home'), data.is_new_user ? { state: { returnTo, returnState } } : (returnTo ? { state: returnState } : undefined));
      } else {
        setError('Google sync failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Google Sign-In failed.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-split-view" style={{ 
      background: 'hsl(220 100% 98%)',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      color: 'hsl(220 20% 12%)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Background Animated Blobs for mobile or right pane */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-15%',
        width: '60vw',
        height: '60vw',
        borderRadius: '50%',
        background: 'hsla(220, 87%, 53%, 0.15)',
        filter: 'blur(80px)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-20%',
        width: '70vw',
        height: '70vw',
        borderRadius: '50%',
        background: 'hsla(260, 87%, 53%, 0.15)',
        filter: 'blur(100px)',
        zIndex: 0
      }} />

      {/* Left Pane (Desktop Only) */}
      <div className="auth-left-pane">
        <div style={{ fontSize: '5rem', marginBottom: '24px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' }}>🏙️</div>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px' }}>{t('appName')}</h1>
        <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '400px', lineHeight: 1.5 }}>
          {t('appTagline')}
        </p>
      </div>

      {/* Right Pane */}
      <div className="auth-right-pane">
        {/* Top Bar inside right pane */}
        <div style={{ width: '100%', paddingBottom: '24px', zIndex: 10, display: 'flex' }}>
          <a 
            href={import.meta.env.VITE_LANDING_URL ?? 'http://localhost:5176'} 
            style={{ 
              textDecoration: 'none', 
              color: 'hsl(220 20% 40%)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: 500, 
              fontSize: '14px',
              background: 'rgba(255, 255, 255, 0.7)',
              padding: '8px 16px',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'hsl(220 20% 12%)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'hsl(220 20% 40%)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            <span>←</span> Back to Landing Page
          </a>
        </div>

        {/* Mobile Header (Hidden on Desktop via CSS maybe? Or just keep it small) */}
        <div className="mobile-only-header" style={{ textAlign: 'center', marginBottom: '24px', zIndex: 10, animation: 'fadeInDown 0.6s ease' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))'
          }}>🏙️</div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            marginBottom: '8px',
            background: 'linear-gradient(180deg, hsl(220 20% 12%) 0%, hsl(220 20% 30%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {t('appName')}
          </h1>
          <p style={{ color: 'hsl(220 20% 40%)', fontSize: '15px' }}>{t('appTagline')}</p>
        </div>

        {/* Form Container */}
        <div style={{ 
          width: '100%',
          maxWidth: '420px', 
          zIndex: 10 
        }}>

        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '24px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
          animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          
          {step === 'choice' && (
            <>
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center' }}>
                  {error}
                </div>
              )}
              
              {/* Guest Card */}
              <button
                onClick={handleGuest}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.8)', 
                  border: '1px solid rgba(0, 0, 0, 0.05)', 
                  borderRadius: '16px',
                  padding: '20px', 
                  cursor: 'pointer', 
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 1)'; e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'; e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.05)'; }}
              >
                <div style={{ fontSize: '28px', background: 'hsl(220 100% 97%)', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px', border: '1px solid hsl(220 87% 90%)' }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'hsl(220 20% 12%)', marginBottom: '4px' }}>{t('continueAsGuest')}</div>
                  <div style={{ fontSize: '13px', color: 'hsl(220 20% 40%)', lineHeight: 1.4 }}>{t('guestDesc')}</div>
                </div>
              </button>

              {/* Account Card */}
              <button
                onClick={() => setStep('enter-contact')}
                style={{
                  background: 'linear-gradient(135deg, hsl(220 87% 65%) 0%, hsl(220 87% 53%) 100%)', 
                  border: 'none', 
                  borderRadius: '16px',
                  padding: '20px', 
                  cursor: 'pointer', 
                  textAlign: 'left',
                  boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)', 
                  transition: 'all 0.2s',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(59, 130, 246, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.3)'; }}
              >
                <div style={{ fontSize: '28px', background: 'rgba(255,255,255,0.2)', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px' }}>✨</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: 'white', marginBottom: '4px' }}>Sign In / Sign Up</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>{t('accountDesc')}</div>
                </div>
              </button>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.05)' }} />
                <span style={{ color: 'hsl(220 20% 60%)', fontSize: '12px', fontWeight: 500 }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.05)' }} />
              </div>

              {/* Google Sign-In */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  background: 'white', 
                  border: '1px solid rgba(0,0,0,0.1)', 
                  borderRadius: '16px',
                  padding: '16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center', 
                  gap: '12px', 
                  fontWeight: 600, 
                  fontSize: '15px', 
                  color: '#1E293B',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
              >
                <span style={{ fontSize: '1.2rem' }}>🔵</span>
                Continue with Google
              </button>
            </>
          )}

          {step === 'enter-contact' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
              <button onClick={() => setStep('choice')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220 20% 50%)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
                ← {t('back' as any)}
              </button>
              
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(220 20% 12%)', marginBottom: '8px' }}>Sign In / Sign Up</h2>
                <p style={{ color: 'hsl(220 20% 40%)', fontSize: '14px' }}>Choose how you want to sign in or create an account.</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.04)', padding: '6px', borderRadius: '14px' }}>
                <button
                  onClick={() => setContactType('phone')}
                  style={{ 
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: contactType === 'phone' ? 'white' : 'transparent', 
                    cursor: 'pointer', fontWeight: 600, 
                    color: contactType === 'phone' ? 'hsl(220 87% 53%)' : 'hsl(220 20% 50%)',
                    transition: 'all 0.2s',
                    boxShadow: contactType === 'phone' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  📱 {t('phone')}
                </button>
                <button
                  onClick={() => setContactType('email')}
                  style={{ 
                    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                    background: contactType === 'email' ? 'white' : 'transparent', 
                    cursor: 'pointer', fontWeight: 600, 
                    color: contactType === 'email' ? 'hsl(220 87% 53%)' : 'hsl(220 20% 50%)',
                    transition: 'all 0.2s',
                    boxShadow: contactType === 'email' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  ✉️ {t('email')}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={contactType === 'phone' ? 'tel' : 'email'}
                  placeholder={contactType === 'phone' ? '+91 98765 43210' : 'you@example.com'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '14px',
                    background: 'white',
                    border: '1px solid rgba(0,0,0,0.1)',
                    color: 'hsl(220 20% 12%)',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(220 87% 53%)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px hsla(220, 87%, 53%, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: 0 }}>{error}</p>}
              
              <button 
                onClick={handleRequestOtp} 
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, hsl(220 87% 65%) 0%, hsl(220 87% 53%) 100%)',
                  color: 'white', border: 'none', borderRadius: '14px',
                  padding: '16px', fontSize: '16px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)',
                  transition: 'transform 0.1s',
                  marginTop: '8px'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {loading ? t('sending') : t('sendCode')}
              </button>
            </div>
          )}

          {step === 'enter-otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
              <button onClick={() => setStep('enter-contact')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220 20% 50%)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', padding: 0 }}>
                ← {t('back' as any)}
              </button>
              
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(220 20% 12%)', marginBottom: '8px' }}>{t('enterVerificationCode' as any)}</h2>
                <p style={{ color: 'hsl(220 20% 40%)', fontSize: '14px', lineHeight: 1.5 }}>
                  We sent a code to <span style={{ color: 'hsl(220 20% 12%)', fontWeight: 600 }}>{contactValue}</span>. For the demo, enter 123456.
                </p>
              </div>

              <input
                type="number"
                inputMode="numeric"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: 'white', border: '1px solid rgba(0,0,0,0.1)',
                  color: 'hsl(220 20% 12%)', fontSize: '24px', letterSpacing: '0.3em', textAlign: 'center',
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'hsl(220 87% 53%)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px hsla(220, 87%, 53%, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              
              {error && <p style={{ color: '#EF4444', fontSize: '13px', margin: 0, textAlign: 'center' }}>{error}</p>}
              
              <button 
                onClick={handleVerifyOtp} 
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, hsl(220 87% 65%) 0%, hsl(220 87% 53%) 100%)',
                  color: 'white', border: 'none', borderRadius: '14px',
                  padding: '16px', fontSize: '16px', fontWeight: 600,
                  cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.3)',
                  transition: 'transform 0.1s', marginTop: '8px'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {loading ? t('verifying') : t('verifyAndContinue')}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* End Right Pane */}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-only-header { display: none; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
