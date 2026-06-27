/**
 * SLA Configuration Screen — ui_ux_specification.md §4.1
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS, SEVERITY_LABELS } from '@civicmind/shared';
import type { SLAConfigEntry } from '../../../shared/src/api-client.js';

// Demo fallback data
const MOCK_SLA: SLAConfigEntry[] = [
  { config_id: '1', category: 'pothole', severity: 'critical', sla_hours: 12, updated_at: new Date().toISOString() },
  { config_id: '2', category: 'pothole', severity: 'high', sla_hours: 48, updated_at: new Date().toISOString() },
  { config_id: '3', category: 'streetlight', severity: 'critical', sla_hours: 24, updated_at: new Date().toISOString() },
  { config_id: '4', category: 'water_leakage', severity: 'critical', sla_hours: 6, updated_at: new Date().toISOString() },
];

export default function SlaConfigScreen() {
  const { token } = useAuth();
  const [configs, setConfigs] = useState<SLAConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchConfigs = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/admin/sla-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setConfigs(data.configs ?? MOCK_SLA);
        } else if (active) setConfigs(MOCK_SLA);
      } catch {
        if (active) setConfigs(MOCK_SLA);
      }
      if (active) setLoading(false);
    };
    fetchConfigs();
    return () => { active = false; };
  }, [token]);

  const handleUpdate = async (configId: string, category: string, severity: string, newHours: number) => {
    setSaving(configId);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/admin/sla-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ category, severity, sla_hours: newHours })
      });
      if (res.ok) {
        const updated = await res.json();
        setConfigs(prev => prev.map(c => c.config_id === configId ? updated : c));
      } else {
        // Demo fallback
        setConfigs(prev => prev.map(c => c.config_id === configId ? { ...c, sla_hours: newHours, updated_at: new Date().toISOString() } : c));
      }
    } catch {
      setConfigs(prev => prev.map(c => c.config_id === configId ? { ...c, sla_hours: newHours, updated_at: new Date().toISOString() } : c));
    }
    setSaving(null);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>SLA Configuration</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Manage the expected resolution time for different categories and severities. Time is in hours.</p>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Severity</th>
              <th>SLA Deadline (Hours)</th>
              <th>Last Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {configs.map(config => (
              <SlaRow 
                key={config.config_id} 
                config={config} 
                onSave={(newHours) => handleUpdate(config.config_id, config.category, config.severity, newHours)} 
                isSaving={saving === config.config_id} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlaRow({ config, onSave, isSaving }: { config: SLAConfigEntry, onSave: (h: number) => void, isSaving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(config.sla_hours);

  const handleSave = () => {
    onSave(val);
    setEditing(false);
  };

  return (
    <tr>
      <td><span style={{ fontWeight: 500 }}>{(CATEGORY_LABELS as Record<string, string>)[config.category] ?? config.category}</span></td>
      <td>{(SEVERITY_LABELS as Record<string, string>)[config.severity] ?? config.severity}</td>
      <td>
        {editing ? (
          <input 
            type="number" 
            value={val} 
            onChange={(e) => setVal(Number(e.target.value))} 
            className="form-input" 
            style={{ width: '80px', padding: '6px' }}
            min="1"
            max="720"
          />
        ) : (
          <span style={{ fontWeight: 600 }}>{config.sla_hours} hours</span>
        )}
      </td>
      <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{new Date(config.updated_at).toLocaleString()}</td>
      <td>
        {editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={handleSave} style={{ padding: '6px 12px' }}>Save</button>
            <button className="btn-secondary" onClick={() => { setEditing(false); setVal(config.sla_hours); }} style={{ padding: '6px 12px' }}>Cancel</button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setEditing(true)} style={{ padding: '6px 12px' }} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Edit'}
          </button>
        )}
      </td>
    </tr>
  );
}
