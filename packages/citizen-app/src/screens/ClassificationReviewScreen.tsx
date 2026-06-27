/**
 * Classification Review Screen — ui_ux_specification.md §2.5
 * AI category/severity chips with confidence indicators; citizen can override.
 * Handles the low-confidence confirmation requirement (BR-1.1).
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IssueCategory, IssueSeverity, CLASSIFICATION_AUTO_CONFIRM_THRESHOLD } from '@civicmind/shared';
import { CategoryChip, SeverityChip, ConfidenceIndicator, LoadingSpinner } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';

const CATEGORIES = Object.values(IssueCategory);
const SEVERITIES = Object.values(IssueSeverity);

interface LocationState {
  issueId: string;
  suggestedCategory: string;
  categoryConfidence: number;
  suggestedSeverity: string;
  severityConfidence: number;
  requiresConfirmation: boolean;
  photoPreview: string | null;
  location: { lat: number; lng: number };
}

export default function ClassificationReviewScreen() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: LocationState };
  const { token } = useAuth();

  // Fallback if navigated directly without state
  const locationState = state ?? {
    issueId: 'ISS-DEMO-001',
    suggestedCategory: 'pothole',
    categoryConfidence: 0.87,
    suggestedSeverity: 'high',
    severityConfidence: 0.79,
    requiresConfirmation: false,
    photoPreview: null,
    location: { lat: 12.9716, lng: 77.5946 },
  };

  const [category, setCategory] = useState(locationState.suggestedCategory);
  const [severity, setSeverity] = useState(locationState.suggestedSeverity);
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSeverityPicker, setShowSeverityPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLowConfidence = locationState.categoryConfidence < CLASSIFICATION_AUTO_CONFIRM_THRESHOLD;
  const categoryChanged = category !== locationState.suggestedCategory;
  const severityChanged = severity !== locationState.suggestedSeverity;

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues/${locationState.issueId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmed_category: category, confirmed_severity: severity, description: description || null }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.duplicate_candidate) {
          navigate('/report/duplicate', {
            state: {
              issueId: locationState.issueId,
              candidateId: data.duplicate_candidate.issue_id,
              matchConfidence: data.duplicate_candidate.match_confidence,
              photoPreview: locationState.photoPreview,
            },
          });
        } else {
          navigate('/report/confirmation', {
            state: { issueId: locationState.issueId, category, severity, photoPreview: locationState.photoPreview },
          });
        }
      } else {
        // Demo fallback
        navigate('/report/confirmation', {
          state: { issueId: locationState.issueId, category, severity, photoPreview: locationState.photoPreview },
        });
      }
    } catch {
      navigate('/report/confirmation', {
        state: { issueId: locationState.issueId, category, severity, photoPreview: locationState.photoPreview },
      });
    }
    setLoading(false);
  };

  return (
    <div style={{ height: '100dvh', background: 'white', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <span style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b' }}>Review Classification</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Photo thumbnail */}
        {locationState.photoPreview && (
          <img
            src={locationState.photoPreview}
            alt="Captured issue"
            style={{ width: '100%', aspectRatio: '4/3', maxHeight: '40vh', objectFit: 'contain', backgroundColor: '#f8fafc', borderRadius: '12px', marginBottom: '16px' }}
          />
        )}
        {!locationState.photoPreview && (
          <div style={{ width: '100%', aspectRatio: '4/3', maxHeight: '40vh', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', marginBottom: '16px' }}>
            📷
          </div>
        )}

        {/* AI trust signal — per ui_ux_spec §8 "Never let automated decision look like a black box" */}
        <div style={{ background: 'hsl(220 100% 97%)', border: '1px solid hsl(220 96% 85%)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🤖 AI analyzed your photo in ~3 seconds. {categoryChanged || severityChanged ? 'You\'ve updated the classification below.' : 'Confirm the classification or override it.'}
        </div>

        {/* Low-confidence warning per BR-1.1 */}
        {isLowConfidence && (
          <div style={{ background: 'hsl(36 100% 97%)', border: '1px solid hsl(36 100% 80%)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#92400e' }}>
            ⚠️ AI confidence is low for this category. Please confirm or select the correct category.
          </div>
        )}

        {/* Category */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Category
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <CategoryChip
              category={category}
              confidence={categoryChanged ? undefined : locationState.categoryConfidence}
              outlined={isLowConfidence && !categoryChanged}
              onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            />
            {!categoryChanged && <ConfidenceIndicator score={locationState.categoryConfidence} label={`${Math.round(locationState.categoryConfidence * 100)}% confidence`} />}
          </div>
          {showCategoryPicker && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setShowCategoryPicker(false); }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px',
                    border: `1px solid ${cat === category ? '#3b82f6' : '#e2e8f0'}`,
                    background: cat === category ? '#eff6ff' : 'white',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)',
                    color: cat === category ? '#1e40af' : '#64748b',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Severity */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Severity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <SeverityChip
              severity={severity}
              confidence={severityChanged ? undefined : locationState.severityConfidence}
              onClick={() => setShowSeverityPicker(!showSeverityPicker)}
            />
            {!severityChanged && <ConfidenceIndicator score={locationState.severityConfidence} label={`${Math.round(locationState.severityConfidence * 100)}% confidence`} />}
          </div>
          {showSeverityPicker && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {SEVERITIES.map((sev) => (
                <button
                  key={sev}
                  onClick={() => { setSeverity(sev); setShowSeverityPicker(false); }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px',
                    border: `1px solid ${sev === severity ? '#3b82f6' : '#e2e8f0'}`,
                    background: sev === severity ? '#eff6ff' : 'white',
                    cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)',
                    color: sev === severity ? '#1e40af' : '#64748b',
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Description (optional, collapsed) */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setShowDescription(!showDescription)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: '14px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {showDescription ? '▼' : '▶'} Add description (optional)
          </button>
          {showDescription && (
            <textarea
              className="text-input"
              placeholder="Describe the issue briefly (max 500 characters)…"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              style={{ marginTop: '8px' }}
            />
          )}
          {showDescription && (
            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
              {description.length}/500
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #f1f5f9' }}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ height: '56px', fontSize: '16px' }}
        >
          {loading ? (
            <><LoadingSpinner size={20} /> Submitting…</>
          ) : isLowConfidence ? (
            '✓ Confirm & Submit'
          ) : (
            '🚀 Submit Report'
          )}
        </button>
      </div>
    </div>
  );
}
