/**
 * Duplicate Candidate Confirmation — ui_ux_specification.md §2.6
 * Conditional screen shown when Validator Agent finds a medium-confidence match (BR-2.3).
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { MOCK_ISSUES } from '../data/mockData.js';

interface LocationState {
  issueId: string;
  candidateId: string;
  matchConfidence: number;
  photoPreview: string | null;
}

export default function DuplicateCandidateScreen() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState };
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [decisionError, setDecisionError] = useState('');

  const s = state ?? {
    issueId: 'ISS-NEW', candidateId: 'ISS-001', matchConfidence: 0.72, photoPreview: null,
  };

  // Find candidate from mock data for display
  const candidate = MOCK_ISSUES.find((i) => i.issue_id === s.candidateId) ?? MOCK_ISSUES[0];

  const handleDecision = async (isSame: boolean) => {
    setLoading(true);
    setDecisionError('');
    let apiSuccess = false;
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues/${s.issueId}/corroborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ is_same_issue: isSame }),
      });
      if (res.ok) {
        apiSuccess = true;
      } else {
        const errData = await res.json().catch(() => ({}));
        // If issue is no longer in duplicate_candidate state, treat as already resolved — navigate anyway
        if (res.status === 409) {
          apiSuccess = true; // State may have changed — proceed gracefully
        } else {
          setDecisionError(errData?.error?.message ?? 'Something went wrong. Please try again.');
        }
      }
    } catch {
      // Network error — allow navigation for demo resilience
      apiSuccess = true;
    }
    setLoading(false);

    if (!apiSuccess) return;

    navigate('/report/confirmation', {
      state: {
        issueId: isSame ? s.candidateId : s.issueId,
        merged: isSame,
        photoPreview: s.photoPreview,
        category: candidate.category,
        severity: candidate.severity,
      },
    });
  };

  return (
    <div style={{ height: '100dvh', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.05)', color: 'var(--color-text-primary)', fontSize: '20px', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>←</button>
        <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>Similar Issue Found</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Explanation — per ui_ux_spec §8 trust signals */}
        <div style={{ background: 'hsl(270 100% 98%)', border: '1px solid hsl(270 67% 85%)', borderRadius: '16px', padding: '16px', marginBottom: '24px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.05)' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#5b21b6', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>🔗</span> Possible Duplicate Detected
          </div>
          <div style={{ fontSize: '14px', color: '#6d28d9', lineHeight: 1.5 }}>
            AI found a similar issue with {Math.round(s.matchConfidence * 100)}% confidence match. Is this the same problem?
            Your report can confirm it's still unresolved, which helps prioritize the fix.
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {/* Existing issue */}
          <div style={{ border: '2px solid hsl(270 67% 60%)', borderRadius: '16px', overflow: 'hidden', background: 'white', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)' }}>
            <div style={{ background: 'hsl(270 100% 97%)', padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid hsl(270 67% 90%)' }}>
              Existing Report
            </div>
            {candidate.photos[0] ? (
              <img src={candidate.photos[0].url} alt="Existing issue" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📌</div>
            )}
            <div style={{ padding: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{candidate.category}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {candidate.location.address_text?.split(',')[0] ?? 'Location'}
              </div>
              <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: 600, marginTop: '6px', background: 'hsl(270 100% 97%)', padding: '4px 8px', borderRadius: '8px', display: 'inline-block' }}>
                👥 {candidate.corroboration_count} reports
              </div>
            </div>
          </div>

          {/* Your report */}
          <div style={{ border: '2px solid rgba(0,0,0,0.05)', borderRadius: '16px', overflow: 'hidden', background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ background: 'var(--color-bg-primary)', padding: '10px 12px', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              Your Report
            </div>
            {s.photoPreview ? (
              <img src={s.photoPreview} alt="Your photo" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📷</div>
            )}
            <div style={{ padding: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{candidate.category}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Just captured</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', background: 'var(--color-brand-50)', padding: '4px 8px', borderRadius: '8px', display: 'inline-block' }}>
                New report
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision buttons */}
      <div style={{ padding: '16px 20px 32px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 -10px 40px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {decisionError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
            ⚠️ {decisionError}
          </div>
        )}
        <button
          onClick={() => handleDecision(true)}
          disabled={loading}
          style={{
            height: '56px', border: 'none', borderRadius: '16px', cursor: 'pointer',
            background: 'hsl(270 67% 60%)', color: 'white',
            fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)'
          }}
        >
          {loading ? <LoadingSpinner size={20} /> : '✅ Yes, same issue'}
        </button>
        <button
          onClick={() => handleDecision(false)}
          disabled={loading}
          style={{
            height: '52px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '16px', cursor: 'pointer',
            background: 'white', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          ❌ No, different issue
        </button>
      </div>
    </div>
  );
}
