import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [trustScore, setTrustScore] = useState<number>(0);
  const [currentTier, setCurrentTier] = useState<string>('Observer');
  const [escalationTokens, setEscalationTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setTrustScore(data.trust_score || 0);
          setCurrentTier(data.current_tier || 'Observer');
          setEscalationTokens(data.available_escalation_tokens || 0);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [userId]);

  // SVG Reputation Ring Logic
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // Let's assume 1000 trust points is the max for a full ring visual
  const progressPercent = Math.min((trustScore / 1000) * 100, 100);
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', background: 'var(--color-bg-primary)' }}>
      <header style={{ padding: '16px', background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>My Profile</h1>
      </header>

      <div style={{ padding: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '32px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Reputation Ring */}
          <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '16px' }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="50" cy="50" r={radius}
                stroke="#e2e8f0" strokeWidth="6" fill="none"
              />
              <circle
                cx="50" cy="50" r={radius}
                stroke="var(--color-brand-500)" strokeWidth="6" fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', zIndex: 10
            }}>
              👤
            </div>
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0' }}>Citizen</h2>
          <span style={{
            background: 'var(--color-brand-50)', color: 'var(--color-brand-600)',
            padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {currentTier}
          </span>

          {loading ? (
            <div style={{ marginTop: '24px', color: '#64748b' }}>Loading stats...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%', marginTop: '32px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Civic Trust</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{trustScore}</div>
              </div>
              <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '16px', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Escalation Tokens</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#92400e' }}>{escalationTokens}</div>
              </div>
            </div>
          )}

          <p style={{ marginTop: '32px', fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
            Earn <strong>Civic Trust</strong> by submitting high-quality reports and assisting AI Verification. High trust unlocks Escalation Tokens!
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 600 }}
            onClick={() => navigate('/my-reports')}
          >
            📋 View My Reports
          </button>

          <button 
            className="btn-outline" 
            style={{ width: '100%', padding: '16px', borderRadius: '16px' }}
            onClick={() => {
              // Placeholder for logout
              navigate('/auth');
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
