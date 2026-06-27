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
    <div style={{ height: '100dvh', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>Similar Issue Found</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Explanation — per ui_ux_spec §8 trust signals */}
        <div style={{ background: 'hsl(270 100% 97%)', border: '1px solid hsl(270 67% 80%)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#5b21b6', marginBottom: '4px' }}>
            🔗 Possible Duplicate Detected
          </div>
          <div style={{ fontSize: '13px', color: '#6d28d9', lineHeight: 1.5 }}>
            AI found a similar issue {Math.round(s.matchConfidence * 100)}% confidence match. Is this the same problem?
            Your report can confirm it's still unresolved, which helps prioritize the fix.
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          {/* Existing issue */}
          <div style={{ border: '2px solid hsl(270 67% 52%)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: 'hsl(270 100% 97%)', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Existing Report
            </div>
            {candidate.photos[0] ? (
              <img src={candidate.photos[0].url} alt="Existing issue" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📌</div>
            )}
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{candidate.category}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {candidate.location.address_text?.split(',')[0] ?? 'Location'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {candidate.corroboration_count} reports
              </div>
            </div>
          </div>

          {/* Your report */}
          <div style={{ border: '2px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Report
            </div>
            {s.photoPreview ? (
              <img src={s.photoPreview} alt="Your photo" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }} />
            ) : (
              <div style={{ aspectRatio: '1', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>📷</div>
            )}
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{candidate.category}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Just captured</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>New report</div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision buttons */}
      <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {decisionError && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
            ⚠️ {decisionError}
          </div>
        )}
        <button
          onClick={() => handleDecision(true)}
          disabled={loading}
          style={{
            height: '56px', border: 'none', borderRadius: '14px', cursor: 'pointer',
            background: 'hsl(270 67% 52%)', color: 'white',
            fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? <LoadingSpinner size={20} /> : '✅ Yes, same issue — Add my confirmation'}
        </button>
        <button
          onClick={() => handleDecision(false)}
          disabled={loading}
          style={{
            height: '52px', border: '1px solid #e2e8f0', borderRadius: '14px', cursor: 'pointer',
            background: 'white', color: '#1e293b',
            fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500,
          }}
        >
          ❌ No, different issue — Submit as new
        </button>
      </div>
    </div>
  );
}
