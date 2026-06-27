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
      <div style={{ height: '100dvh', background: 'hsl(220 100% 98%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 16px 12px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'hsl(220 20% 12%)', letterSpacing: '-0.02em' }}>My Reports</h1>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState 
            icon="👤" 
            title="Create an account to track reports" 
            description="Guest reports help the community, but aren't saved to a profile."
            action={
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ marginTop: '16px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}>
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
    <div style={{ height: '100dvh', background: 'hsl(220 100% 98%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '24px 16px 12px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'hsl(220 20% 12%)', marginBottom: '4px', letterSpacing: '-0.02em' }}>My Reports</h1>
            <div style={{ fontSize: '13px', color: 'hsl(220 20% 40%)' }}>{issues.length} total reports</div>
          </div>
          <button 
            className="btn-ghost"
            onClick={() => navigate('/report')}
            style={{ height: '36px', padding: '0 16px', borderRadius: '12px', background: 'hsl(220 100% 97%)', color: 'hsl(220 87% 53%)', fontWeight: 600, border: '1px solid hsl(220 87% 90%)' }}
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
                background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)',
                padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(0,0,0,0.02)'
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'hsl(220 87% 90%)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.02)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'hsl(220 100% 97%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid hsl(220 87% 90%)' }}>
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
