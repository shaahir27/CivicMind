import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface PerformanceSummary {
  department_id: string;
  total_resolved: number;
  avg_resolution_hours: number;
  verification_success_rate: number;
  peer_rank: number;
}

export default function SlaComplianceScreen() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    let active = true;
    const fetchSummary = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/authority/performance-summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch performance summary');
        const data = await res.json();
        if (active) setSummary(data);
      } catch (err: any) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSummary();
    return () => { active = false; };
  }, [token]);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!summary) return <div>No data available</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '8px' }}>Performance Scorecard</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Department performance for {summary.department_id || 'your assigned department'}</p>
      </div>

      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div className="metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <span className="metric-label" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Avg Resolution Time</span>
          <span className="metric-value" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-primary-700)' }}>
            {summary.avg_resolution_hours.toFixed(1)} hrs
          </span>
        </div>
        
        <div className="metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <span className="metric-label" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Total Resolved</span>
          <span className="metric-value" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-primary-700)' }}>{summary.total_resolved}</span>
        </div>
        
        <div className="metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <span className="metric-label" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>AI Verification Success</span>
          <span className="metric-value" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-success)' }}>
            {(summary.verification_success_rate * 100).toFixed(0)}%
          </span>
        </div>

        <div className="metric-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
          <span className="metric-label" style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: 600 }}>Peer Rank (Citywide)</span>
          <span className="metric-value" style={{ fontSize: '32px', fontWeight: 800, color: '#ca8a04' }}>
            #{summary.peer_rank}
          </span>
        </div>
      </div>
    </div>
  );
}
