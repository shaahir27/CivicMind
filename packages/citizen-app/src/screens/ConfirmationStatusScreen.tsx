/**
 * Confirmation & Live Status Screen — ui_ux_specification.md §2.7
 * Real-time tracking of a single issue. Includes status timeline.
 */

import React, { useState, useEffect } from 'react';
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
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  
  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(0);
  const [csatComment, setCsatComment] = useState('');
  const [csatSubmitted, setCsatSubmitted] = useState(
    () => !!localStorage.getItem(`civicmind_csat_${issueId ?? 'unknown'}`)
  );
  const [csatError, setCsatError] = useState('');

  // Dispute resolution state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeError, setDisputeError] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Poll or listen for updates
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const [res, msgRes] = await Promise.all([
          fetch(`${base}/api/v1/issues/${issueId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`${base}/api/v1/issues/${issueId}/messages`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        ]);

        if (res.ok && active) {
          const data = await res.json();
          setIssue(data);
          if (data.status === 'verified_resolved' || data.status === 'closed') {
             // Check localStorage to avoid re-showing CSAT on every visit
             const alreadySubmitted = !!localStorage.getItem(`civicmind_csat_${issueId}`);
             if (!alreadySubmitted) {
                setShowCsat(true);
             }
          }
        } else if (active) {
          setIssue(MOCK_ISSUES.find(i => i.issue_id === issueId) ?? MOCK_ISSUES[0]);
        }

        if (msgRes.ok && active) {
           const msgData = await msgRes.json();
           setMessages(msgData.messages || []);
        }

      } catch {
        if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === issueId) ?? MOCK_ISSUES[0]);
      }
      if (active) setLoading(false);
    };

    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [issueId, token, csatSubmitted]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isGuest) return;
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues/${issueId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ body: newMessage })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitCsat = async () => {
    if (csatRating === 0) return;
    try {
       const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
       const res = await fetch(`${base}/api/v1/issues/${issueId}/csat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rating: csatRating, comment: csatComment })
      });
      if (res.ok || res.status === 409) {
         // Persist in localStorage so modal doesn't re-appear on revisit
         localStorage.setItem(`civicmind_csat_${issueId}`, '1');
         setCsatSubmitted(true);
         setShowCsat(false);
      } else {
         const data = await res.json();
         setCsatError(data.error?.message || 'Failed to submit CSAT');
      }
    } catch (err: any) {
       setCsatError('Network error');
    }
  };

  const handleDisputeResolution = async () => {
    if (!disputeReason.trim()) return;
    setDisputeLoading(true);
    setDisputeError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues/${issueId}/dispute-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reason: disputeReason })
      });
      if (res.ok) {
        setDisputeSuccess(true);
        setShowDisputeModal(false);
      } else {
        const data = await res.json();
        setDisputeError(data.error?.message || 'Failed to submit dispute. Please try again.');
      }
    } catch {
      setDisputeError('Network error. Please try again.');
    } finally {
      setDisputeLoading(false);
    }
  };

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
          {state?.merged ? 'Successfully Corroborated' : 'Report Details'}
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

        {/* Messaging Box */}
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '20px' }}>Communication</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center' }}>No messages yet.</div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} style={{ 
                  padding: '12px', 
                  background: msg.author_type === 'citizen' ? 'var(--color-brand-50)' : '#f8fafc', 
                  borderRadius: '12px', 
                  border: '1px solid var(--color-border)',
                  alignSelf: msg.author_type === 'citizen' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: msg.author_type === 'citizen' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    {msg.author_type.toUpperCase()} • {new Date(msg.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{msg.body}</div>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input type="text" className="input-field" placeholder={isGuest ? "Log in to send messages" : "Type a message..."} value={newMessage} onChange={e => setNewMessage(e.target.value)} style={{ flexGrow: 1 }} disabled={isGuest} />
            <button type="submit" className="btn-primary" disabled={!newMessage.trim() || isGuest}>Send</button>
          </form>
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

        {/* Dispute Resolution Section — shown when AI verifies but citizen disagrees */}
        {(issue.status === 'verified_resolved' || issue.status === 'inconclusive') && !isGuest && !disputeSuccess && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '16px', padding: '16px', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#c2410c', marginBottom: '4px' }}>Issue not actually fixed?</div>
            <div style={{ fontSize: '13px', color: '#9a3412', marginBottom: '12px' }}>If the problem is still present at the location, you can dispute the resolution. It will be re-routed to the department.</div>
            <button
              onClick={() => setShowDisputeModal(true)}
              style={{ background: '#fff', border: '1.5px solid #f97316', color: '#ea580c', borderRadius: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            >
              🚨 Dispute Resolution
            </button>
          </div>
        )}

        {disputeSuccess && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '16px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>🔄</div>
            <div style={{ fontWeight: 700, color: '#166534' }}>Dispute submitted!</div>
            <div style={{ fontSize: '13px', color: '#15803d' }}>The issue has been reopened and re-routed to the department.</div>
          </div>
        )}

        <div style={{ height: '130px', flexShrink: 0 }} /> {/* Nav spacer */}
      </div>

      {/* CSAT Modal */}
      {showCsat && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
           <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Issue Resolved! 🎉</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>How satisfied are you with the resolution of this issue?</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                   <button 
                     key={star} 
                     onClick={() => setCsatRating(star)}
                     style={{ background: 'none', border: 'none', fontSize: '36px', cursor: 'pointer', transition: 'transform 0.1s', transform: csatRating >= star ? 'scale(1.1)' : 'scale(1)', filter: csatRating >= star ? 'none' : 'grayscale(100%) opacity(30%)' }}
                   >
                     ⭐
                   </button>
                ))}
              </div>

              <textarea 
                className="input-field" 
                placeholder="Any additional feedback? (Optional)" 
                value={csatComment}
                onChange={e => setCsatComment(e.target.value)}
                style={{ width: '100%', minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
              />

              {csatError && <div style={{ color: 'red', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{csatError}</div>}

              <div style={{ display: 'flex', gap: '12px' }}>
                 <button onClick={() => setShowCsat(false)} className="btn-secondary" style={{ flex: 1 }}>Skip</button>
                 <button onClick={handleSubmitCsat} className="btn-primary" disabled={csatRating === 0} style={{ flex: 2 }}>Submit Feedback</button>
              </div>
           </div>
         </div>
       )}

      {/* Dispute Resolution Modal */}
      {showDisputeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Dispute Resolution</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '20px' }}>Please describe why you believe this issue is not actually resolved. This will be reviewed by the authority.</p>
            <textarea
              className="input-field"
              placeholder="e.g. The pothole is still there. The road repair only covered half the area..."
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              style={{ width: '100%', minHeight: '100px', marginBottom: '16px', resize: 'vertical' }}
            />
            {disputeError && <div style={{ color: 'red', fontSize: '13px', marginBottom: '12px' }}>{disputeError}</div>}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowDisputeModal(false); setDisputeError(''); }} className="btn-secondary" style={{ flex: 1 }} disabled={disputeLoading}>Cancel</button>
              <button onClick={handleDisputeResolution} className="btn-primary" style={{ flex: 2, background: '#ef4444' }} disabled={!disputeReason.trim() || disputeLoading}>
                {disputeLoading ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
