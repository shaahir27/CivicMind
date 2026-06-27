/**
 * Authority Dashboard — ui_ux_specification.md §3.1
 * Shows Active Service Queue and SLA summary.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, SLARiskBadge, LoadingSpinner } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '@civicmind/shared';
import type { IssueSummary } from '../../../shared/src/api-client.js';

// Reusing MOCK_ISSUES locally for demo fallback
const MOCK_ISSUES: IssueSummary[] = [
  {
    issue_id: 'ISS-001', category: 'pothole', severity: 'high', status: 'in_progress',
    location: { lat: 12.9716, lng: 77.5946, address_text: '12th Main Rd, Indiranagar' },
    corroboration_count: 7, department_name: 'BBMP — Roads',
    sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    time_remaining_seconds: 14400, created_at: new Date(Date.now() - 86400 * 1000).toISOString(), updated_at: new Date().toISOString()
  },
  {
    issue_id: 'ISS-002', category: 'streetlight', severity: 'medium', status: 'routed',
    location: { lat: 12.9352, lng: 77.6245, address_text: 'BTM Layout 2nd Stage' },
    corroboration_count: 3, department_name: 'BESCOM',
    sla_deadline: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    time_remaining_seconds: 93600, created_at: new Date(Date.now() - 3600 * 1000).toISOString(), updated_at: new Date().toISOString()
  },
  {
    issue_id: 'ISS-004', category: 'water_leakage', severity: 'critical', status: 'escalated',
    location: { lat: 12.9784, lng: 77.6408, address_text: 'Koramangala 4th Block' },
    corroboration_count: 4, department_name: 'BWSSB',
    sla_deadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    time_remaining_seconds: -7200, created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(), updated_at: new Date().toISOString()
  }
];

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/authority/issues`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setIssues(data.issues ?? MOCK_ISSUES);
        } else if (active) {
          setIssues(MOCK_ISSUES);
        }
      } catch {
        if (active) setIssues(MOCK_ISSUES);
      }
      if (active) setLoading(false);
    };
    load();
    const timer = setInterval(load, 15000); // Polling for real-time updates demo
    return () => { active = false; clearInterval(timer); };
  }, [token]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><LoadingSpinner size={40} /></div>;

  const breached = issues.filter(i => i.time_remaining_seconds !== null && i.time_remaining_seconds < 0);
  const atRisk = issues.filter(i => i.time_remaining_seconds !== null && i.time_remaining_seconds >= 0 && i.time_remaining_seconds < 3600 * 24);

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '24px' }}>Active Service Queue</h1>
      
      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Open Issues</span>
          <span className="metric-value">{issues.length}</span>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--color-status-escalated)' }}>
          <span className="metric-label">SLA Breached / Escalated</span>
          <span className="metric-value" style={{ color: 'var(--color-status-escalated)' }}>{breached.length}</span>
        </div>
        <div className="metric-card" style={{ borderLeft: '4px solid var(--color-status-at-risk)' }}>
          <span className="metric-label">Due within 24h</span>
          <span className="metric-value" style={{ color: 'var(--color-status-at-risk)' }}>{atRisk.length}</span>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID / Location</th>
              <th>Category & Severity</th>
              <th>Status</th>
              <th>SLA Status</th>
              <th>Citizen Reports</th>
            </tr>
          </thead>
          <tbody>
            {issues.map(issue => (
              <tr key={issue.issue_id} onClick={() => navigate(`/issue/${issue.issue_id}`)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary-700)' }}>{issue.issue_id}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{issue.location.address_text?.split(',')[0] ?? 'Coordinates'}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{(CATEGORY_ICONS as Record<string, string>)[issue.category] ?? '📌'}</span>
                    <span style={{ fontWeight: 500 }}>{(CATEGORY_LABELS as Record<string, string>)[issue.category] ?? issue.category}</span>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px', textTransform: 'uppercase', color: issue.severity === 'critical' ? 'var(--color-error)' : 'var(--color-text-muted)' }}>
                    {issue.severity} Severity
                  </div>
                </td>
                <td>
                  <StatusBadge status={issue.status} />
                </td>
                <td>
                  <SLARiskBadge deadline={issue.sla_deadline} />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: 'var(--color-neutral-100)', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}>
                    {issue.corroboration_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
