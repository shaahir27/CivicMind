import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/I18nContext.js';
import { useAuth } from '../context/AuthContext.js';

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  useI18n();
  const { token } = useAuth();

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'}/api/v1/auth/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (res.ok) {
        navigate('/home');
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Failed to save profile.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving.');
    }
    setLoading(false);
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, hsl(220 100% 98%) 0%, hsl(220 100% 96%) 100%)' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <button 
          onClick={() => navigate('/auth')} 
          style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px', color: 'hsl(220 20% 40%)' }}
        >
          ←
        </button>
        <h1 style={{ margin: '0 0 0 16px', fontSize: '18px', fontWeight: 800, color: 'hsl(220 20% 12%)', letterSpacing: '-0.02em' }}>Complete Profile</h1>
      </header>
      <div style={{ padding: '32px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '420px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '32px 24px', borderRadius: '24px', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1), inset 0 2px 10px rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
          
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, hsl(220 87% 53%), hsl(220 87% 73%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)' }}>
            👤
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>
            Welcome to CivicSense
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '32px', lineHeight: '1.5' }}>
            Please enter your name to complete your profile. This will be used when you report issues.
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
            <label htmlFor="fullName" style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginLeft: '4px' }}>
              Full Name
            </label>
            <input
              id="fullName"
              className="text-input"
              placeholder="e.g., Rajesh K."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              style={{ fontSize: '16px', padding: '14px 16px' }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '16px', background: 'var(--color-danger-50)', padding: '8px 12px', borderRadius: '8px', width: '100%' }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: '12px' }}
            onClick={handleSave}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
