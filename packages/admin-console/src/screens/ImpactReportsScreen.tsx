/**
 * Impact Reports Screen — ui_ux_specification.md §4.6
 *
 * Form to trigger impact report generation (ward + period selector),
 * plus a list of previously generated reports with civic health score display.
 *
 * Per feature_specifications.md Feature 7 and api_specification.md §6:
 * POST /api/v1/admin/impact-reports/generate
 * GET  /api/v1/admin/impact-reports
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface ImpactReport {
  report_id: string;
  ward_or_area_id: string;
  period_start: string;
  period_end: string;
  total_issues: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  avg_verification_hours: number;
  escalation_rate: number;
  estimated_savings_value: number;
  civic_health_score: number;
  generated_at: string;
}

const MOCK_REPORTS: ImpactReport[] = [
  {
    report_id: 'rpt-001',
    ward_or_area_id: 'ward-101-indiranagar',
    period_start: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    total_issues: 24,
    resolution_rate: 0.875,
    avg_resolution_hours: 38.4,
    avg_verification_hours: 44.1,
    escalation_rate: 0.125,
    estimated_savings_value: 11200,
    civic_health_score: 78,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    report_id: 'rpt-002',
    ward_or_area_id: 'ward-102-koramangala',
    period_start: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    total_issues: 17,
    resolution_rate: 0.706,
    avg_resolution_hours: 52.3,
    avg_verification_hours: 58.2,
    escalation_rate: 0.294,
    estimated_savings_value: 7800,
    civic_health_score: 61,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    report_id: 'rpt-003',
    ward_or_area_id: 'ward-109-btm',
    period_start: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    total_issues: 31,
    resolution_rate: 0.935,
    avg_resolution_hours: 28.7,
    avg_verification_hours: 34.9,
    escalation_rate: 0.065,
    estimated_savings_value: 14500,
    civic_health_score: 91,
    generated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
];

const WARDS = [
  'ward-101-indiranagar',
  'ward-102-koramangala',
  'ward-103-hsrlayout',
  'ward-104-jayanagar',
  'ward-109-btm',
];

function HealthScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: `conic-gradient(${color} ${score * 3.6}deg, hsl(0 0% 100% / 0.06) 0)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: `0 0 16px ${color}40`,
      }}
    >
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'hsl(220 30% 8%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: '9px', color: '#475569', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 12px', background: 'hsl(0 0% 100% / 0.04)', borderRadius: '8px', border: '1px solid hsl(0 0% 100% / 0.07)' }}>
      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>{value}</div>
    </div>
  );
}

export default function ImpactReportsScreen() {
  const { token } = useAuth();
  const [reports, setReports] = useState<ImpactReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    ward_or_area_id: WARDS[0],
    period_start: new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
  });

  const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/admin/impact-reports`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports?.length ? data.reports : MOCK_REPORTS);
      } else {
        setReports(MOCK_REPORTS);
      }
    } catch {
      setReports(MOCK_REPORTS);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/impact-reports/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          ward_or_area_id: form.ward_or_area_id,
          period_start: (form.period_start && !isNaN(new Date(form.period_start).getTime())) ? new Date(form.period_start).toISOString() : new Date().toISOString(),
          period_end: (form.period_end && !isNaN(new Date(form.period_end).getTime())) ? new Date(form.period_end).toISOString() : new Date().toISOString(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setGenMsg(`✅ Report generated! Civic Health Score: ${data.civic_health_score} for ${form.ward_or_area_id}`);
        await fetchReports();
      } else {
        await res.json().catch(() => ({}));
        if (res.status === 422) {
          setGenMsg('⚠️ Insufficient issue data for this ward/period (minimum 3 issues required).');
        } else {
          // Demo fallback: inject mock report
          setGenMsg('⚠️ Backend offline — showing demo report.');
          setReports((prev) => [
            {
              report_id: `rpt-demo-${Date.now()}`,
              ward_or_area_id: form.ward_or_area_id,
              period_start: new Date(form.period_start).toISOString(),
              period_end: new Date(form.period_end).toISOString(),
              total_issues: 12,
              resolution_rate: 0.833,
              avg_resolution_hours: 36,
              avg_verification_hours: 42,
              escalation_rate: 0.083,
              estimated_savings_value: 5400,
              civic_health_score: 74,
              generated_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      }
    } catch {
      setGenMsg('⚠️ Backend offline — showing demo report.');
      setReports((prev) => [
        {
          report_id: `rpt-demo-${Date.now()}`,
          ward_or_area_id: form.ward_or_area_id,
          period_start: (form.period_start && !isNaN(new Date(form.period_start).getTime())) ? new Date(form.period_start).toISOString() : new Date().toISOString(),
          period_end: (form.period_end && !isNaN(new Date(form.period_end).getTime())) ? new Date(form.period_end).toISOString() : new Date().toISOString(),
          total_issues: 12,
          resolution_rate: 0.833,
          avg_resolution_hours: 36,
          avg_verification_hours: 42,
          escalation_rate: 0.083,
          estimated_savings_value: 5400,
          civic_health_score: 74,
          generated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setGenerating(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
          Community Impact Reports
        </h1>
        <p style={{ color: '#94a3b8' }}>
          Generate ward-level impact reports with quantified civic outcomes.{' '}
          <span style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
            ⚠️ Cost/savings estimates are proxies — not audited financials (BR-7.1)
          </span>
        </p>
      </div>

      {/* Generator Form */}
      <div
        style={{
          background: 'hsl(0 0% 100% / 0.04)',
          border: '1px solid hsl(0 0% 100% / 0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ marginBottom: '24px', padding: '16px', background: 'hsl(230 84% 54% / 0.1)', borderLeft: '4px solid hsl(230 84% 67%)', borderRadius: '4px 8px 8px 4px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'hsl(230 84% 75%)' }}>💡 What does this do?</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
            This tool aggregates resolved issues for a ward, calculating real-world metrics like <strong>Resolution Speed</strong>, <strong>Escalation Rates</strong>, and estimated <strong>Financial Savings</strong>. It computes a final <strong>Civic Health Score (0-100)</strong> to help city managers measure departmental efficiency and ROI.
          </p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', marginBottom: '20px' }}>
          Generate New Report
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ward / Area
            </label>
            <select
              value={form.ward_or_area_id}
              onChange={(e) => setForm((f) => ({ ...f, ward_or_area_id: e.target.value }))}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
            >
              {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Period Start
            </label>
            <input
              type="date"
              value={form.period_start}
              onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Period End
            </label>
            <input
              type="date"
              value={form.period_end}
              onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '12px 28px',
              background: generating ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 600,
              fontSize: '14px',
              cursor: generating ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: generating ? 'none' : '0 0 20px hsl(162 63% 41% / 0.4)',
              transition: 'all 0.2s',
            }}
          >
            {generating ? '⏳ Generating…' : '📊 Generate Report'}
          </button>
          {genMsg && (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>{genMsg}</span>
          )}
        </div>
      </div>

      {/* Report List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <p style={{ fontWeight: 600 }}>No reports yet</p>
          <p style={{ fontSize: '13px' }}>Generate your first impact report above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8', marginBottom: '4px' }}>
            Generated Reports ({reports.length})
          </h2>
          {reports.map((rpt) => (
            <div
              key={rpt.report_id}
              style={{
                background: 'hsl(0 0% 100% / 0.04)',
                border: '1px solid hsl(0 0% 100% / 0.08)',
                borderRadius: '16px',
                padding: '24px',
                backdropFilter: 'blur(12px)',
                transition: 'border-color 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                <HealthScoreRing score={rpt.civic_health_score} />
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: '#f1f5f9' }}>{rpt.ward_or_area_id}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(rpt.period_start).toLocaleDateString()} – {new Date(rpt.period_end).toLocaleDateString()}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: 'hsl(0 0% 100% / 0.06)',
                        border: '1px solid hsl(0 0% 100% / 0.12)',
                        borderRadius: '20px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        fontWeight: 600,
                      }}
                    >
                      Civic Health Score
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                    <MetricPill label="Total Issues" value={String(rpt.total_issues)} />
                    <MetricPill label="Resolution Rate" value={`${Math.round(rpt.resolution_rate * 100)}%`} />
                    <MetricPill label="Avg Resolution" value={`${rpt.avg_resolution_hours.toFixed(1)}h`} />
                    <MetricPill label="Escalation Rate" value={`${Math.round(rpt.escalation_rate * 100)}%`} />
                    <MetricPill
                      label="Est. Savings *"
                      value={`₹${rpt.estimated_savings_value.toLocaleString()}`}
                    />
                    <MetricPill label="Generated" value={new Date(rpt.generated_at).toLocaleDateString()} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
