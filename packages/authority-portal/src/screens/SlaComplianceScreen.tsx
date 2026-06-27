/**
 * SLA Compliance Dashboard — ui_ux_specification.md §3.3
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS } from '@civicmind/shared';

export default function SlaComplianceScreen() {
  const { user } = useAuth();
  
  // For demo purposes, we generate some mock analytics since there's no dedicated endpoint in v1
  // We would derive this from the issues list
  const [metrics] = useState({
    totalResolved: 145,
    withinSla: 122,
    breached: 23,
    avgResolutionTimeHours: 34,
    escalationRate: 15.8,
  });

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-neutral-800)', marginBottom: '8px' }}>SLA Compliance Dashboard</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Department performance for {user?.department_id ?? 'your assigned department'}</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Resolution Rate (Within SLA)</span>
          <span className="metric-value" style={{ color: 'var(--color-success)' }}>
            {Math.round((metrics.withinSla / metrics.totalResolved) * 100)}%
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Target: 95%</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Total Escalations</span>
          <span className="metric-value" style={{ color: 'var(--color-error)' }}>{metrics.breached}</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>This month</span>
        </div>
        
        <div className="metric-card">
          <span className="metric-label">Avg Resolution Time</span>
          <span className="metric-value">{metrics.avgResolutionTimeHours}h</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Across all categories</span>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Category Breakdown</h2>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Resolved</th>
                <th>Breached</th>
                <th>Compliance Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style={{ fontWeight: 500 }}>{CATEGORY_LABELS['pothole']}</span></td>
                <td>45</td>
                <td>12</td>
                <td><span style={{ color: 'var(--color-status-at-risk)', fontWeight: 600 }}>78%</span></td>
              </tr>
              <tr>
                <td><span style={{ fontWeight: 500 }}>{CATEGORY_LABELS['streetlight']}</span></td>
                <td>60</td>
                <td>2</td>
                <td><span style={{ color: 'var(--color-success)', fontWeight: 600 }}>96%</span></td>
              </tr>
              <tr>
                <td><span style={{ fontWeight: 500 }}>{CATEGORY_LABELS['garbage']}</span></td>
                <td>40</td>
                <td>9</td>
                <td><span style={{ color: 'var(--color-status-at-risk)', fontWeight: 600 }}>81%</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
