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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, hsl(220 100% 97%) 0%, white 60%)' }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '16px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <button 
          onClick={() => navigate('/auth')} 
          style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px' }}
        >
          ←
        </button>
        <h1 style={{ margin: '0 0 0 16px', fontSize: '18px', fontWeight: 600 }}>Complete Profile</h1>
      </header>
      <div style={{ padding: '32px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '420px', margin: '0 auto', width: '100%' }}>
        <div style={{ background: 'white', padding: '32px 24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, hsl(220 87% 53%), hsl(220 87% 73%))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '32px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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
