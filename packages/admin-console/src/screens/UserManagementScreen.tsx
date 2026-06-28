/**
 * User & Role Management Screen — ui_ux_specification.md §4.4
 *
 * User table (name/email, role, department/jurisdiction scope),
 * "Invite User" action with a form modal.
 *
 * Per api_specification.md §5:
 * GET  /api/v1/admin/users
 * POST /api/v1/admin/users
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'authority' | 'admin';
  department_id: string | null;
  jurisdiction_scope: string[];
  is_guest: boolean;
  created_at: string;
}

const MOCK_USERS: AdminUser[] = [
  {
    user_id: 'auth-001',
    email: 'roads.officer@bbmp.gov.in',
    display_name: 'Rajesh Kumar',
    role: 'authority',
    department_id: 'd5ef3db1-e1cf-41cb-b3ec-332d1f7c81d3',
    jurisdiction_scope: ['ward-101-indiranagar', 'ward-102-koramangala'],
    is_guest: false,
    created_at: new Date(Date.now() - 30 * 86400 * 1000).toISOString(),
  },
  {
    user_id: 'auth-002',
    email: 'bescom.engineer@bescom.gov.in',
    display_name: 'Priya Sharma',
    role: 'authority',
    department_id: 'de7af73e-324c-4740-9a3d-c11df5b91b92',
    jurisdiction_scope: ['ward-109-btm', 'ward-103-hsrlayout'],
    is_guest: false,
    created_at: new Date(Date.now() - 25 * 86400 * 1000).toISOString(),
  },
  {
    user_id: 'auth-003',
    email: 'sanitation@bbmp.gov.in',
    display_name: 'Ananya Reddy',
    role: 'authority',
    department_id: 'd688cf0c-444a-4c2f-ad34-6014e7a83d3e',
    jurisdiction_scope: ['ward-104-jayanagar'],
    is_guest: false,
    created_at: new Date(Date.now() - 20 * 86400 * 1000).toISOString(),
  },
  {
    user_id: 'admin-001',
    email: 'admin@civicmind.gov',
    display_name: 'CivicSense Admin',
    role: 'admin',
    department_id: null,
    jurisdiction_scope: [],
    is_guest: false,
    created_at: new Date(Date.now() - 60 * 86400 * 1000).toISOString(),
  },
];

const WARDS = [
  'ward-101-indiranagar',
  'ward-102-koramangala',
  'ward-103-hsrlayout',
  'ward-104-jayanagar',
  'ward-109-btm',
];

export const DEPARTMENTS: Record<string, string> = {
  'de7af73e-324c-4740-9a3d-c11df5b91b92': 'BESCOM — Electricity & Streetlights',
  'df7cf500-bf64-44b4-8461-8cc5c7df7cbf': 'BWSSB — Water Supply & Sewerage',
  'd688cf0c-444a-4c2f-ad34-6014e7a83d3e': 'BBMP — Sanitation & Waste Management',
  'd5ef3db1-e1cf-41cb-b3ec-332d1f7c81d3': 'BBMP — Road Infrastructure & Potholes',
  'da31b40c-2dfd-4be9-813c-0e78c4391fa8': 'Bangalore Traffic Police — Signals',
  'dffcc31b-563b-4860-9bc8-ee2cf3ff1b5f': 'BBMP — General Fallback Administration',
};

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin';
  return (
    <span
      style={{
        padding: '3px 10px',
        background: isAdmin ? 'hsl(280 80% 50% / 0.2)' : 'hsl(200 80% 50% / 0.2)',
        border: `1px solid ${isAdmin ? 'hsl(280 80% 50% / 0.4)' : 'hsl(200 80% 50% / 0.4)'}`,
        color: isAdmin ? '#c084fc' : '#38bdf8',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {role}
    </span>
  );
}

function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (user: AdminUser) => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'authority' as 'authority' | 'admin',
    department_id: 'dept-roads-001',
    jurisdiction_scope: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

  const handleSubmit = async () => {
    if (!form.email) { setError('Email is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          department_id: form.role === 'authority' ? form.department_id : null,
          jurisdiction_scope: form.role === 'authority' ? form.jurisdiction_scope : [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onInvite(data as AdminUser);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) setError('Email already registered.');
        else setError((err as { error?: { message?: string } }).error?.message ?? 'Failed to create user.');
      }
    } catch {
      // Demo fallback
      const mockUser: AdminUser = {
        user_id: `user-${Date.now()}`,
        email: form.email,
        display_name: form.display_name || null,
        role: form.role,
        department_id: form.role === 'authority' ? form.department_id : null,
        jurisdiction_scope: form.role === 'authority' ? form.jurisdiction_scope : [],
        is_guest: false,
        created_at: new Date().toISOString(),
      };
      onInvite(mockUser);
      onClose();
    }
    setSaving(false);
  };

  const toggleWard = (ward: string) => {
    setForm((f) => ({
      ...f,
      jurisdiction_scope: f.jurisdiction_scope.includes(ward)
        ? f.jurisdiction_scope.filter((w) => w !== ward)
        : [...f.jurisdiction_scope, ward],
    }));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'hsl(220 30% 12%)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', marginBottom: '24px' }}>Invite User</h2>

        {error && (
          <div style={{ padding: '12px', background: 'hsl(0 80% 50% / 0.15)', border: '1px solid hsl(0 80% 50% / 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="officer@department.gov.in"
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="Officer name"
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'authority' | 'admin' }))}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="authority">Authority</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'authority' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Department</label>
                <select
                  value={form.department_id}
                  onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' }}
                >
                  {Object.entries(DEPARTMENTS).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>Jurisdiction Scope</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {WARDS.map((ward) => (
                    <button
                      key={ward}
                      onClick={() => toggleWard(ward)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${form.jurisdiction_scope.includes(ward) ? '#818cf8' : 'hsl(0 0% 100% / 0.1)'}`,
                        background: form.jurisdiction_scope.includes(ward) ? 'hsl(238 84% 67% / 0.2)' : 'transparent',
                        color: form.jurisdiction_scope.includes(ward) ? '#818cf8' : '#64748b',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {form.jurisdiction_scope.includes(ward) ? '✓ ' : ''}{ward}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', background: 'hsl(0 0% 100% / 0.05)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '10px', color: '#94a3b8', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{ padding: '10px 24px', background: saving ? '#334155' : 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', boxShadow: saving ? 'none' : '0 0 16px hsl(238 84% 67% / 0.4)', transition: 'all 0.2s' }}
          >
            {saving ? '⏳ Sending…' : '✉️ Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementScreen() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/admin/users`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users && data.users.length > 0 ? data.users : MOCK_USERS);
      } else {
        setUsers(MOCK_USERS);
      }
    } catch {
      setUsers(MOCK_USERS);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>User & Role Management</h1>
          <p style={{ color: '#94a3b8' }}>Manage authority and admin accounts. Citizen accounts are self-registered.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 0 20px hsl(238 84% 67% / 0.4)', transition: 'all 0.2s', flexShrink: 0 }}
        >
          + Invite User
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Jurisdiction Scope</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '14px' }}>
                        {user.display_name ?? '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{user.email}</div>
                    </div>
                  </td>
                  <td><RoleBadge role={user.role} /></td>
                  <td style={{ fontSize: '13px', color: '#94a3b8' }}>
                    {user.department_id ? (DEPARTMENTS[user.department_id] ?? user.department_id) : '—'}
                  </td>
                  <td>
                    {user.jurisdiction_scope.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#475569' }}>All</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {user.jurisdiction_scope.slice(0, 2).map((w) => (
                          <span key={w} style={{ fontSize: '11px', padding: '2px 8px', background: 'hsl(0 0% 100% / 0.06)', border: '1px solid hsl(0 0% 100% / 0.1)', borderRadius: '12px', color: '#94a3b8' }}>
                            {w}
                          </span>
                        ))}
                        {user.jurisdiction_scope.length > 2 && (
                          <span style={{ fontSize: '11px', color: '#475569' }}>+{user.jurisdiction_scope.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <InviteModal
          onClose={() => setShowModal(false)}
          onInvite={(newUser) => setUsers((prev) => [newUser, ...prev])}
        />
      )}
    </div>
  );
}
