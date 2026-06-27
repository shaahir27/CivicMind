/**
 * Authority Issue Detail & Action View — ui_ux_specification.md §3.2
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatusBadge, SLARiskBadge, LoadingSpinner, StatusTimeline, MapPlaceholder } from '../components/shared.js';
import { useAuth } from '../context/AuthContext.js';
import { CATEGORY_LABELS } from '@civicmind/shared';
import type { IssueDetail } from '../../../shared/src/api-client.js';
import { storage } from '../config/firebase.js';
import { ref, uploadBytes } from 'firebase/storage';

// MOCK_ISSUES copy for demo
const MOCK_ISSUES: IssueDetail[] = [
  {
    issue_id: 'ISS-001', category: 'pothole', severity: 'high', status: 'in_progress',
    location: { lat: 12.9716, lng: 77.5946, address_text: '12th Main Rd, Indiranagar' },
    corroboration_count: 7, department_name: 'BBMP — Roads',
    sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    time_remaining_seconds: 14400, created_at: new Date(Date.now() - 86400 * 1000).toISOString(), updated_at: new Date().toISOString(),
    description: 'Large pothole near the signal.',
    photos: [{ photo_id: '1', photo_type: 'before', url: 'https://picsum.photos/seed/civicsense11/400/300' }],
    status_history: [{ to_status: 'submitted', created_at: new Date(Date.now() - 86400 * 1000).toISOString(), reason: null }, { to_status: 'routed', created_at: new Date(Date.now() - 86000 * 1000).toISOString(), reason: null }, { to_status: 'in_progress', created_at: new Date().toISOString(), reason: 'Crew dispatched' }]
  }
];

export default function IssueDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [issue, setIssue] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  
  // Resolution photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolvePhotoUrl, setResolvePhotoUrl] = useState<string | null>(null);
  const [resolvePhotoFile, setResolvePhotoFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    const fetchIssue = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        const res = await fetch(`${base}/api/v1/issues/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && active) setIssue(await res.json());
        else if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === id) ?? MOCK_ISSUES[0]);
      } catch {
        if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === id) ?? MOCK_ISSUES[0]);
      }
      if (active) setLoading(false);
    };
    fetchIssue();
    return () => { active = false; };
  }, [id, token]);

  const handleUpdateStatus = async (newStatus: 'in_progress' | 'resolved') => {
    if (newStatus === 'resolved' && !resolvePhotoUrl) {
      setActionError('Resolution photo is required to mark as resolved.');
      return;
    }
    setActionLoading(true); setActionError('');
    try {
      let finalPhotoUrl: string | null = null;
      if (newStatus === 'resolved' && resolvePhotoFile) {
        const storagePath = `resolutions/${id}/after_${Date.now()}.jpg`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, resolvePhotoFile);
        finalPhotoUrl = storagePath; // Send storage path, NOT the HTTPS download URL
      }

      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/authority/issues/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ new_status: newStatus, after_photo_ref: finalPhotoUrl })
      });
      
      if (res.ok) {
        // Refresh
        const updated = await fetch(`${base}/api/v1/issues/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (updated.ok) setIssue(await updated.json());
        if (newStatus === 'resolved') setResolvePhotoUrl(null); // Clear photo after success
      } else {
        // Demo fallback: update local state
        if (issue) {
          setIssue({
            ...issue,
            status: newStatus,
            status_history: [...issue.status_history, { to_status: newStatus, created_at: new Date().toISOString(), reason: newStatus === 'resolved' ? 'Authority uploaded resolution photo' : 'Authority began work' }],
            photos: newStatus === 'resolved' && resolvePhotoUrl ? [...issue.photos, { photo_id: 'after-1', photo_type: 'after', url: resolvePhotoUrl }] : issue.photos
          });
          if (newStatus === 'resolved') setResolvePhotoUrl(null);
        }
      }
    } catch {
       if (issue) {
          setIssue({
            ...issue,
            status: newStatus,
            status_history: [...issue.status_history, { to_status: newStatus, created_at: new Date().toISOString(), reason: newStatus === 'resolved' ? 'Authority uploaded resolution photo' : 'Authority began work' }],
            photos: newStatus === 'resolved' && resolvePhotoUrl ? [...issue.photos, { photo_id: 'after-1', photo_type: 'after', url: resolvePhotoUrl }] : issue.photos
          });
          if (newStatus === 'resolved') setResolvePhotoUrl(null);
        }
    }
    setActionLoading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setActionError('');
      setResolvePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setResolvePhotoUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><LoadingSpinner size={40} /></div>;
  if (!issue) return <div>Issue not found.</div>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
      {/* Left Col: Details & Photos */}
      <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '8px', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {(CATEGORY_LABELS as Record<string, string>)[issue.category] ?? issue.category}
              <StatusBadge status={issue.status} />
            </h1>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>Issue ID: {issue.issue_id} • Reported {new Date(issue.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '16px' }}>Issue Photos</h3>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
              {issue.photos.map(p => (
                <div key={p.photo_id} style={{ position: 'relative' }}>
                  <img src={p.url} alt={p.photo_type} style={{ width: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                    {p.photo_type}
                  </span>
                </div>
              ))}
              {issue.photos.length === 0 && <div style={{ width: '100%', height: '150px', background: 'var(--color-neutral-100)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No photos</div>}
            </div>
          </div>
          
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '16px' }}>Location</h3>
            <div style={{ height: '150px', borderRadius: '8px', overflow: 'hidden' }}>
              <MapPlaceholder pins={typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number' ? [{ id: issue.issue_id, lat: issue.location.lat, lng: issue.location.lng, category: issue.category, status: issue.status, severity: issue.severity }] : []} interactive={false} />
            </div>
            <div style={{ fontSize: '14px', marginTop: '12px', color: 'var(--color-text-secondary)' }}>
              📍 {issue.location?.address_text ?? (typeof issue.location?.lat === 'number' && typeof issue.location?.lng === 'number' ? `${issue.location.lat}, ${issue.location.lng}` : 'Location unavailable')}
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '16px' }}>Description & Corroborations</h3>
          <p style={{ color: 'var(--color-text-primary)', lineHeight: 1.6, marginBottom: '16px' }}>{issue.description || 'No description provided.'}</p>
          <div style={{ background: 'var(--color-neutral-50)', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            <span style={{ fontSize: '20px' }}>👥</span> 
            <strong>{issue.corroboration_count} citizens</strong> have reported or corroborated this issue.
          </div>
        </div>
      </div>

      {/* Right Col: Action Panel & Timeline */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="action-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Authority Action</h2>
            {issue.sla_deadline && <SLARiskBadge deadline={issue.sla_deadline} />}
          </div>

          {/* Action buttons based on current state */}
          {issue.status === 'routed' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Acknowledge this issue to start work. This notifies citizens that maintenance is underway.
              </p>
              <button 
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={actionLoading}
                style={{ width: '100%', padding: '12px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                {actionLoading ? <LoadingSpinner size={18} /> : '🔧 Mark as In Progress'}
              </button>
            </div>
          )}

          {issue.status === 'in_progress' && (
            <div>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Upload an "after" photo to prove resolution. AI will verify the fix before closing the ticket.
              </p>
              
              {resolvePhotoUrl ? (
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <img src={resolvePhotoUrl} alt="Resolution" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                  <button onClick={() => setResolvePhotoUrl(null)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
                </div>
              ) : (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: '100%', padding: '24px', background: 'var(--color-neutral-50)', border: '2px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s' }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📸</div>
                  Upload Resolution Photo
                </button>
              )}
              
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              
              {actionError && <div style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '12px' }}>{actionError}</div>}
              
              <button 
                onClick={() => handleUpdateStatus('resolved')}
                disabled={actionLoading}
                style={{ width: '100%', padding: '12px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                {actionLoading ? <LoadingSpinner size={18} /> : '✅ Submit for Verification'}
              </button>
            </div>
          )}

          {(issue.status === 'resolved' || issue.status === 'verifying' || issue.status === 'verified_resolved' || issue.status === 'closed') && (
            <div style={{ background: 'hsl(142 71% 97%)', border: '1px solid hsl(142 71% 80%)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
              <h3 style={{ color: '#166534', fontSize: '14px', fontWeight: 600 }}>Resolution Submitted</h3>
              <p style={{ color: '#15803d', fontSize: '13px', marginTop: '4px' }}>The issue is pending AI verification or is already closed.</p>
            </div>
          )}

          {(issue.status === 'escalated' || issue.status === 'publicly_escalated') && (
            <div style={{ background: 'hsl(36 100% 97%)', border: '1px solid hsl(36 100% 80%)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <h3 style={{ color: '#92400e', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>⚠️ Escalated Issue</h3>
              <p style={{ color: '#b45309', fontSize: '13px', lineHeight: 1.5 }}>This issue requires immediate attention from department heads. Mark as In Progress immediately.</p>
              <button 
                onClick={() => handleUpdateStatus('in_progress')}
                disabled={actionLoading}
                style={{ width: '100%', padding: '10px', background: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '12px', display: 'flex', justifyContent: 'center' }}
              >
                {actionLoading ? <LoadingSpinner size={18} /> : 'Acknowledge & Start Work'}
              </button>
            </div>
          )}
        </div>

        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Issue Timeline</h3>
          <StatusTimeline currentStatus={issue.status} history={issue.status_history} />
        </div>
      </div>
    </div>
  );
}
