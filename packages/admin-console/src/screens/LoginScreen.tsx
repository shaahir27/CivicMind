/**
 * Admin Console Login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.role !== 'admin') {
          setError('Access denied. Administrator credentials required.');
        } else {
          login(data.access_token, data);
          navigate('/sla-config');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Ensure backend is running.');
    }
    setLoading(false);
  };

  const handleDemoLogin = () => {
    login('demo-admin-token', {
      access_token: 'demo-admin-token',
      user_id: 'admin-001',
      role: 'admin',
      department_id: null,
      jurisdiction_scope: ['global'],
    });
    navigate('/sla-config');
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', background: 'var(--color-bg-secondary)' }}>
      {/* Brand Panel - Left Side */}
      <div style={{ 
        flex: 1, 
        background: '#0f172a', // Admin Slate
        color: 'white',
        padding: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <a 
          href={import.meta.env.VITE_LANDING_URL ?? 'http://localhost:5176'} 
          style={{ position: 'absolute', top: '24px', left: '24px', textDecoration: 'none', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px' }}
        >
          ← Back to Landing Page
        </a>
        
        <div style={{ maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '24px' }}>⚙️</div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2 }}>
            Configure CivicSense Citywide
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '48px', lineHeight: 1.5 }}>
            Sign in to access system configuration, manage SLA policies, view impact reports, and oversee global operations.
          </p>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>99.9%</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>System Uptime</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
              <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>24/7</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Agent Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel - Right Side */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px',
        background: 'var(--color-bg-primary, #ffffff)'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary, #1e293b)', marginBottom: '8px' }}>Admin Console</h2>
            <p style={{ color: 'var(--color-text-secondary, #64748b)' }}>Enter your administrator credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Admin Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@civicmind.gov"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '15px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '15px' }}
              />
            </div>
            {error && (
              <div style={{ color: '#ef4444', fontSize: '14px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                {error}
              </div>
            )}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                background: '#0f172a', color: 'white', border: 'none', 
                padding: '14px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, 
                cursor: 'pointer', marginTop: '8px',
                display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}
            >
              {loading ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{ background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-text-secondary)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
            >
              Enter Demo Mode (No Auth)
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
