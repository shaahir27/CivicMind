/**
 * My Reports Screen — ui_ux_specification.md §2.8
 * List view of all issues reported by the logged-in citizen.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, EmptyState, FullPageSpinner, StatusTimeline, SLARiskBadge } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { MOCK_ISSUES } from '../data/mockData.js';
import type { IssueSummary } from '../../../shared/src/api-client.js';
import { CATEGORY_LABELS } from '@civicmind/shared';

export default function MyReportsScreen() {
  const navigate = useNavigate();
  const { token, isGuest } = useAuth();
  
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/issues?mine=true`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setIssues(data.issues ?? MOCK_ISSUES.slice(0, 3));
        } else {
          setIssues(MOCK_ISSUES.slice(0, 3));
        }
      } catch {
        setIssues(MOCK_ISSUES.slice(0, 3));
      }
      setLoading(false);
    };
    if (!isGuest) load();
    else setLoading(false);
  }, [token, isGuest]);

  if (isGuest) {
    return (
      <div style={{ height: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 16px 12px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>My Reports</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState 
            icon="👤" 
            title="Create an account to track reports" 
            description="Guest reports help the community, but aren't saved to a profile."
            action={
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ marginTop: '16px' }}>
                Create Account
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (loading) return <FullPageSpinner />;

  return (
    <div style={{ height: '100dvh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 16px 12px', background: 'white', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>My Reports</h1>
            <div style={{ fontSize: '13px', color: '#64748b' }}>{issues.length} total reports</div>
          </div>
          <button 
            className="btn-ghost"
            onClick={() => navigate('/report')}
            style={{ height: '36px', padding: '0 12px', borderRadius: '8px', background: '#eff6ff' }}
          >
            + New
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {issues.length === 0 ? (
          <EmptyState 
            icon="📋" 
            title="No reports yet" 
            description="You haven't reported any issues. Help keep your city clean and safe!" 
            action={
              <button className="btn-primary" onClick={() => navigate('/report')} style={{ marginTop: '16px' }}>
                Report an Issue
              </button>
            }
          />
        ) : (
          issues.map((issue) => (
            <button
              key={issue.issue_id}
              onClick={() => navigate(`/issue/${issue.issue_id}`)}
              style={{
                all: 'unset', boxSizing: 'border-box', width: '100%',
                background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#bfdbfe'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    {(CATEGORY_LABELS as Record<string, string>)[issue.category] ? '📌' : '📌'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>
                      {(CATEGORY_LABELS as Record<string, string>)[issue.category] ?? issue.category}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(issue.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <StatusBadge status={issue.status} size="sm" />
              </div>

              <div style={{ fontSize: '13px', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                📍 {issue.location.address_text ?? 'Location details unavailable'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <div style={{ flex: 1 }}>
                  {/* Compact timeline indicator */}
                  <StatusTimeline currentStatus={issue.status} history={[]} compact />
                </div>
                {issue.sla_deadline && issue.status !== 'verified_resolved' && issue.status !== 'resolved' && (
                  <SLARiskBadge deadline={issue.sla_deadline} size="sm" />
                )}
              </div>
            </button>
          ))
        )}
        <div style={{ height: '80px' }} /> {/* Nav spacer */}
      </div>
    </div>
  );
}
