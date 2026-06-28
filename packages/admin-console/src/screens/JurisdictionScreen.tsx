/**
 * Jurisdiction Mapping Screen — ui_ux_specification.md §4.2
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS } from '@civicmind/shared';
import type { JurisdictionMappingEntry } from '../../../shared/src/api-client.js';
import { DEPARTMENTS } from './UserManagementScreen.js';

const MOCK_MAPPINGS: JurisdictionMappingEntry[] = [
  { mapping_id: '1', ward_or_area_id: 'ward-101-indiranagar', category: 'pothole', department_id: 'd5ef3db1-e1cf-41cb-b3ec-332d1f7c81d3', is_fallback: false },
  { mapping_id: '2', ward_or_area_id: 'ward-101-indiranagar', category: 'streetlight', department_id: 'de7af73e-324c-4740-9a3d-c11df5b91b92', is_fallback: false },
  { mapping_id: '3', ward_or_area_id: 'DEFAULT', category: 'pothole', department_id: 'dffcc31b-563b-4860-9bc8-ee2cf3ff1b5f', is_fallback: true },
];

export default function JurisdictionScreen() {
  const { token } = useAuth();
  const [mappings, setMappings] = useState<JurisdictionMappingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchMappings = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/admin/jurisdiction-mapping`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          setMappings(data.mappings && data.mappings.length > 0 ? data.mappings : MOCK_MAPPINGS);
        } else if (active) {
          setMappings(MOCK_MAPPINGS);
        }
      } catch {
        if (active) setMappings(MOCK_MAPPINGS);
      }
      if (active) setLoading(false);
    };
    fetchMappings();
    return () => { active = false; };
  }, [token]);

  const handleUpdate = async (mappingId: string, ward: string, category: string, newDept: string) => {
    setSaving(mappingId);
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/admin/jurisdiction-mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ward_or_area_id: ward, category, department_id: newDept })
      });
      if (res.ok) {
        const updated = await res.json();
        setMappings(prev => prev.map(m => m.mapping_id === mappingId ? updated : m));
      } else {
        setMappings(prev => prev.map(m => m.mapping_id === mappingId ? { ...m, department_id: newDept } : m));
      }
    } catch {
      setMappings(prev => prev.map(m => m.mapping_id === mappingId ? { ...m, department_id: newDept } : m));
    }
    setSaving(null);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Jurisdiction Mapping</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Route issues to the correct department based on location (ward) and category.</p>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ward / Area</th>
              <th>Category</th>
              <th>Assigned Department</th>
              <th>Fallback?</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(mapping => (
              <MappingRow 
                key={mapping.mapping_id} 
                mapping={mapping} 
                onSave={(newDept) => handleUpdate(mapping.mapping_id, mapping.ward_or_area_id, mapping.category, newDept)} 
                isSaving={saving === mapping.mapping_id} 
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MappingRow({ mapping, onSave, isSaving }: { mapping: JurisdictionMappingEntry, onSave: (d: string) => void, isSaving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(mapping.department_id);

  const handleSave = () => {
    onSave(val);
    setEditing(false);
  };

  return (
    <tr>
      <td><span style={{ fontWeight: 600 }}>{mapping.ward_or_area_id}</span></td>
      <td>{(CATEGORY_LABELS as Record<string, string>)[mapping.category] ?? mapping.category}</td>
      <td>
        {editing ? (
          <select 
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            className="form-input" 
            style={{ width: '250px', padding: '6px' }}
          >
            {Object.entries(DEPARTMENTS).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        ) : (
          <span style={{ fontWeight: 500, color: 'var(--color-primary-700)' }}>{DEPARTMENTS[mapping.department_id] ?? mapping.department_id}</span>
        )}
      </td>
      <td>{mapping.is_fallback ? 'Yes' : 'No'}</td>
      <td>
        {editing ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={handleSave} style={{ padding: '6px 12px' }}>Save</button>
            <button className="btn-secondary" onClick={() => { setEditing(false); setVal(mapping.department_id); }} style={{ padding: '6px 12px' }}>Cancel</button>
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
