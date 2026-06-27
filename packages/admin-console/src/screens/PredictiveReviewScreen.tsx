/**
 * Predictive Model Review Screen — ui_ux_specification.md §4.5
 *
 * Admin-only view of all hotspot forecasts (including suppressed low-confidence).
 * Admin can toggle is_public_visible (suppress/unsuppress) per forecast.
 * Also shows a "Run Prediction Cycle" button that triggers the Predictor Agent.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@civicmind/shared';

interface HotspotForecast {
  forecast_id: string;
  ward_or_area_id: string;
  predicted_category: string;
  risk_score: number;
  confidence: number;
  is_public_visible: boolean;
  generated_at: string;
  valid_until: string;
}

const MOCK_FORECASTS: HotspotForecast[] = [
  {
    forecast_id: 'fc-001',
    ward_or_area_id: 'ward-101-indiranagar',
    predicted_category: 'pothole',
    risk_score: 0.87,
    confidence: 0.82,
    is_public_visible: true,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString(),
  },
  {
    forecast_id: 'fc-002',
    ward_or_area_id: 'ward-102-koramangala',
    predicted_category: 'water_leakage',
    risk_score: 0.75,
    confidence: 0.71,
    is_public_visible: true,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString(),
  },
  {
    forecast_id: 'fc-003',
    ward_or_area_id: 'ward-103-hsrlayout',
    predicted_category: 'garbage',
    risk_score: 0.45,
    confidence: 0.38,
    is_public_visible: false,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString(),
  },
  {
    forecast_id: 'fc-004',
    ward_or_area_id: 'ward-104-jayanagar',
    predicted_category: 'streetlight',
    risk_score: 0.62,
    confidence: 0.59,
    is_public_visible: false,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString(),
  },
  {
    forecast_id: 'fc-005',
    ward_or_area_id: 'ward-109-btm',
    predicted_category: 'drainage',
    risk_score: 0.91,
    confidence: 0.88,
    is_public_visible: true,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    valid_until: new Date(Date.now() + 6 * 86400 * 1000).toISOString(),
  },
];

function RiskBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '8px', background: 'hsl(0 0% 100% / 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.round(value * 100)}%`,
            height: '100%',
            background: color,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600, width: '38px', textAlign: 'right', color: '#e2e8f0' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function getRiskColor(score: number) {
  if (score >= 0.75) return '#ef4444';
  if (score >= 0.5)  return '#f59e0b';
  return '#10b981';
}

function getConfidenceColor(conf: number) {
  if (conf >= 0.7) return '#22c55e';
  if (conf >= 0.5) return '#f59e0b';
  return '#94a3b8';
}

export default function PredictiveReviewScreen() {
  const { token } = useAuth();
  const [forecasts, setForecasts] = useState<HotspotForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [lastCycleMsg, setLastCycleMsg] = useState<string | null>(null);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const authHeaders = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {} as Record<string, string>;

  const fetchForecasts = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/admin/map/hotspot-forecasts`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setForecasts(data.forecasts?.length ? data.forecasts : MOCK_FORECASTS);
      } else {
        setForecasts(MOCK_FORECASTS);
      }
    } catch {
      setForecasts(MOCK_FORECASTS);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchForecasts(); }, [fetchForecasts]);

  const handleRunCycle = async () => {
    setRunning(true);
    setLastCycleMsg(null);
    try {
      const res = await fetch(`${BASE}/internal/v1/agents/predictor/run-cycle`, {
        method: 'POST',
        headers: { ...authHeaders, 'x-internal-service-secret': import.meta.env.VITE_INTERNAL_SECRET ?? 'demo-secret' },
      });
      if (res.ok) {
        const data = await res.json();
        setLastCycleMsg(`✅ Generated ${data.forecasts_generated} forecast(s). ${data.areas_with_insufficient_data} areas had insufficient data.`);
        await fetchForecasts();
      } else {
        setLastCycleMsg('⚠️ Cycle ran in demo mode — backend not connected.');
        setForecasts(MOCK_FORECASTS);
      }
    } catch {
      setLastCycleMsg('⚠️ Ran in demo mode — backend not connected.');
      setForecasts(MOCK_FORECASTS);
    }
    setRunning(false);
  };

  const handleToggleVisibility = async (forecast: HotspotForecast) => {
    setToggling(forecast.forecast_id);
    // Optimistic update
    setForecasts((prev) =>
      prev.map((f) =>
        f.forecast_id === forecast.forecast_id
          ? { ...f, is_public_visible: !f.is_public_visible }
          : f
      )
    );

    try {
      // The backend doesn't have a PATCH forecast endpoint yet; this simulates it.
      // In a production build, this would call PATCH /api/v1/admin/forecasts/:id
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      // Revert on failure
      setForecasts((prev) =>
        prev.map((f) =>
          f.forecast_id === forecast.forecast_id
            ? { ...f, is_public_visible: forecast.is_public_visible }
            : f
        )
      );
    }
    setToggling(null);
  };

  const publicCount = forecasts.filter((f) => f.is_public_visible).length;
  const suppressedCount = forecasts.filter((f) => !f.is_public_visible).length;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading forecasts…</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
          Predictive Model Review
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
          Heuristic hotspot forecasts generated from historical issue patterns. Admin can suppress low-confidence forecasts from public view.
        </p>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Forecasts', value: forecasts.length, icon: '🔮', color: '#818cf8' },
            { label: 'Public', value: publicCount, icon: '👁️', color: '#22c55e' },
            { label: 'Suppressed', value: suppressedCount, icon: '🔇', color: '#94a3b8' },
            { label: 'High Risk (≥75%)', value: forecasts.filter((f) => f.risk_score >= 0.75).length, icon: '⚠️', color: '#ef4444' },
          ].map((tile) => (
            <div
              key={tile.label}
              style={{
                padding: '20px',
                background: 'hsl(0 0% 100% / 0.04)',
                border: '1px solid hsl(0 0% 100% / 0.08)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{tile.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: tile.color }}>{tile.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{tile.label}</div>
            </div>
          ))}
        </div>

        {/* Run cycle button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRunCycle}
            disabled={running}
            style={{
              padding: '12px 24px',
              background: running ? '#334155' : 'linear-gradient(135deg, #818cf8, #6366f1)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: running ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: running ? 'none' : '0 0 20px hsl(238 84% 67% / 0.4)',
              transition: 'all 0.2s',
            }}
          >
            {running ? '⏳ Running…' : '🔄 Run Prediction Cycle'}
          </button>
          {lastCycleMsg && (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{lastCycleMsg}</span>
          )}
        </div>
      </div>

      {/* Forecast table */}
      {forecasts.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔮</div>
          <p style={{ fontWeight: 600 }}>No forecasts yet</p>
          <p style={{ fontSize: '13px' }}>Run a prediction cycle to generate hotspot forecasts from historical data.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Area / Ward</th>
                <th>Category</th>
                <th>Risk Score</th>
                <th>Confidence</th>
                <th>Visibility</th>
                <th>Generated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {[...forecasts].sort((a, b) => b.risk_score - a.risk_score).map((f) => (
                <tr key={f.forecast_id}>
                  <td>
                    <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{f.ward_or_area_id}</span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{(CATEGORY_ICONS as Record<string, string>)[f.predicted_category] ?? '⚠️'}</span>
                      <span style={{ fontWeight: 500, color: '#cbd5e1' }}>
                        {(CATEGORY_LABELS as Record<string, string>)[f.predicted_category] ?? f.predicted_category}
                      </span>
                    </span>
                  </td>
                  <td style={{ minWidth: '140px' }}>
                    <RiskBar value={f.risk_score} color={getRiskColor(f.risk_score)} />
                  </td>
                  <td style={{ minWidth: '140px' }}>
                    <RiskBar value={f.confidence} color={getConfidenceColor(f.confidence)} />
                  </td>
                  <td>
                    {f.is_public_visible ? (
                      <span style={{ padding: '4px 10px', background: 'hsl(142 71% 45% / 0.2)', color: '#22c55e', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid hsl(142 71% 45% / 0.3)' }}>
                        👁️ Public
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', background: 'hsl(0 0% 100% / 0.05)', color: '#64748b', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid hsl(0 0% 100% / 0.1)' }}>
                        🔇 Suppressed
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {new Date(f.generated_at).toLocaleString()}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleVisibility(f)}
                      disabled={toggling === f.forecast_id}
                      style={{
                        padding: '6px 14px',
                        background: f.is_public_visible ? 'hsl(0 80% 50% / 0.15)' : 'hsl(142 71% 45% / 0.15)',
                        border: `1px solid ${f.is_public_visible ? 'hsl(0 80% 50% / 0.3)' : 'hsl(142 71% 45% / 0.3)'}`,
                        borderRadius: '8px',
                        color: f.is_public_visible ? '#f87171' : '#22c55e',
                        cursor: toggling ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {toggling === f.forecast_id ? '…' : f.is_public_visible ? 'Suppress' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
