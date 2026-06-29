/**
 * Confirmation & Live Status Screen — ui_ux_specification.md §2.7
 * Real-time tracking of a single issue. Includes status timeline.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { StatusBadge, StatusTimeline, SLARiskBadge, LoadingSpinner, MapPlaceholder } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { MOCK_ISSUES } from '../data/mockData.js';
import type { IssueDetail } from '../../../shared/src/api-client.js';
import { useI18n } from '../context/I18nContext.js';

export default function ConfirmationStatusScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation() as { state?: { issueId: string; merged?: boolean; photoPreview?: string | null } };
  const { token, isGuest } = useAuth();
  const { t } = useI18n();

  const issueId = id ?? state?.issueId ?? 'ISS-DEMO';

  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  // Poll or listen for updates
  useEffect(() => {
    let active = true;
    const fetchIssue = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/issues/${issueId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          setIssue(await res.json());
        } else if (active) {
          // Demo fallback
          setIssue(MOCK_ISSUES.find(i => i.issue_id === issueId) ?? MOCK_ISSUES[0]);
        }
      } catch {
        if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === issueId) ?? MOCK_ISSUES[0]);
      }
      if (active) setLoading(false);
    };

    fetchIssue();
    // Simulate real-time updates by polling for demo
    const timer = setInterval(fetchIssue, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [issueId, token]);

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
        <LoadingSpinner size={40} />
        <p style={{ marginTop: '16px', color: 'var(--color-text-muted)' }}>Loading report details...</p>
      </div>
    );
  }

  if (!issue) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', marginTop: '40px' }}>
        <h2>Report not found</h2>
        <button className="btn-primary" onClick={() => navigate('/home')} style={{ marginTop: '16px' }}>Back to Home</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--color-text-primary)', fontSize: '20px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>✕</button>
        <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
          {state?.merged ? 'Successfully Corroborated' : 'Report Submitted'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Success Banner */}
        {state?.issueId && (
          <div style={{ background: 'hsl(142 71% 97%)', border: '1px solid hsl(142 71% 80%)', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
              {state.merged ? 'Report Corroborated!' : 'Report Submitted!'}
            </h2>
            <p style={{ fontSize: '13px', color: '#15803d', lineHeight: 1.5 }}>
              {state.merged
                ? 'Your confirmation has been added. This helps prioritize the fix.'
                : 'Thank you for making the city better. We have routed your report.'}
            </p>
          </div>
        )}

        {/* Guest Warning */}
        {isGuest && (
          <div style={{ background: 'var(--color-brand-50)', border: '1px solid var(--color-brand-300)', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px' }}>🔔</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e40af', marginBottom: '2px' }}>Want live updates?</div>
              <div style={{ fontSize: '13px', color: '#1e3a8a', marginBottom: '8px' }}>You submitted this as a guest. Create an account to get notifications when this is fixed.</div>
              <button onClick={() => navigate('/auth')} style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, color: '#2563eb', cursor: 'pointer' }}>
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Report Card */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', marginBottom: '24px' }}>
          {(!imageFailed && (state?.photoPreview || issue.photos?.[0]?.url)) ? (
            <img
              src={state?.photoPreview ?? issue.photos[0]?.url}
              alt="Issue"
              style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '140px',
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                {issue.category === 'pothole' ? '🕳️' : issue.category === 'garbage' ? '🗑️' : issue.category === 'lighting' ? '💡' : issue.category === 'water' ? '💧' : '🚧'}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af', fontFamily: 'var(--font-sans)' }}>
                Evidence Securely Uploaded
              </span>
            </div>
          )}

          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                  {t(issue.category as any) ?? issue.category}
                </h2>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {issue.location?.address_text ?? (typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number' ? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}` : 'Location unavailable')}
                </div>
              </div>
              <StatusBadge status={issue.status} />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Report ID</span>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{issue.issue_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Assigned To</span>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>{issue.department_name ?? 'Routing...'}</span>
              </div>
              {issue.reporter_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Reported By</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{issue.reporter_name}</span>
                </div>
              )}
              {issue.description && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: '#64748b' }}>Description</div>
                  {issue.description}
                </div>
              )}
              {issue.sla_deadline && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#64748b' }}>Resolution SLA</span>
                  <SLARiskBadge deadline={issue.sla_deadline} size="sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '20px' }}>Live Tracking</h3>
          <StatusTimeline currentStatus={issue.status} history={issue.status_history} />
        </div>

        {/* Location Map Box */}
        {(typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number') && (
          <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: '20px 20px 12px' }}>Location</h3>
            <div style={{ height: '200px' }}>
              <MapPlaceholder
                pins={[{ id: issue.issue_id, lat: issue.location.lat, lng: issue.location.lng, category: issue.category, status: issue.status, severity: issue.severity }]}
                userLocation={null}
                height="100%"
                interactive={false}
              />
            </div>
            <div style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
              {issue.location.address_text ?? `${issue.location.lat.toFixed(4)}, ${issue.location.lng.toFixed(4)}`}
            </div>
          </div>
        )}

        <div style={{ height: '130px', flexShrink: 0 }} /> {/* Nav spacer */}
      </div>
    </div>
  );
}
