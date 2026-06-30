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
import { useOfflineSync } from '../hooks/useOfflineSync.js';

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
  
  // Messaging state
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Work order state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [contractorName, setContractorName] = useState('');
  const [assignedWorker, setAssignedWorker] = useState<string | null>(null);
  
  // Resolution photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resolvePhotoUrl, setResolvePhotoUrl] = useState<string | null>(null);
  const [resolvePhotoFile, setResolvePhotoFile] = useState<File | null>(null);

  const { isOnline, addToQueue } = useOfflineSync();

  useEffect(() => {
    let active = true;
    const fetchIssueAndMessages = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
        
        const [res, msgRes] = await Promise.all([
          fetch(`${base}/api/v1/issues/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`${base}/api/v1/issues/${id}/messages`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        ]);
        
        if (res.ok && active) setIssue(await res.json());
        else if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === id) ?? MOCK_ISSUES[0]);

        if (msgRes.ok && active) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }
      } catch {
        if (active) setIssue(MOCK_ISSUES.find(i => i.issue_id === id) ?? MOCK_ISSUES[0]);
      }
      if (active) setLoading(false);
    };
    fetchIssueAndMessages();
    return () => { active = false; };
  }, [id, token]);

  const handleUpdateStatus = async (newStatus: 'in_progress' | 'resolved') => {
    if (newStatus === 'resolved' && !resolvePhotoUrl) {
      setActionError('Resolution photo is required to mark as resolved.');
      return;
    }

    if (!isOnline) {
      // Offline mode: queue it
      addToQueue({
        issue_id: id as string,
        new_status: newStatus,
        photo_data_url: resolvePhotoUrl, // Already a data URL from FileReader
        timestamp: Date.now()
      });
      // Optimistically update UI
      setIssue(prev => prev ? { ...prev, status: newStatus } : null);
      setResolvePhotoUrl(null);
      return;
    }

    setActionLoading(true); setActionError('');
    try {
      let finalPhotoUrl: string | null = null;
      if (newStatus === 'resolved' && resolvePhotoFile) {
        const storagePath = `resolutions/${id}/after_${Date.now()}.jpg`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, resolvePhotoFile);
        finalPhotoUrl = storagePath;
      }

      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/authority/issues/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ new_status: newStatus, after_photo_ref: finalPhotoUrl })
      });
      
      if (res.ok) {
        const updated = await fetch(`${base}/api/v1/issues/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (updated.ok) setIssue(await updated.json());
        if (newStatus === 'resolved') setResolvePhotoUrl(null);
      }
    } catch {
      setActionError('Failed to update status');
    }
    setActionLoading(false);
  };

  const handleAssign = async () => {
    if (!contractorName.trim()) return;
    setActionLoading(true); setActionError('');
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/authority/issues/${id}/assign-work-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ contractor_name: contractorName })
      });
      if (res.ok) {
        setAssignedWorker(contractorName);
        setShowAssignModal(false);
        const updated = await fetch(`${base}/api/v1/issues/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (updated.ok) setIssue(await updated.json());
      }
    } catch (err) {
      setActionError('Failed to assign work order');
    }
    setActionLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const res = await fetch(`${base}/api/v1/issues/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ body: newMessage })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error(err);
    }
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
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; color: black; }
          .screen-container { padding: 0; }
          .card { border: none; box-shadow: none; padding: 0; }
        }
      `}</style>
      
      <div className="print-only" style={{ display: 'none', padding: '40px' }}>
        <h1>Work Order: {issue.issue_id}</h1>
        <p><strong>Department:</strong> {issue.department_name}</p>
        <p><strong>Category:</strong> {issue.category} | <strong>Severity:</strong> {issue.severity}</p>
        <p><strong>Location:</strong> {issue.location?.address_text}</p>
        <p><strong>Description:</strong> {issue.description}</p>
        <hr style={{ margin: '20px 0' }}/>
        <p><strong>Assigned To:</strong> {assignedWorker || 'Unassigned'}</p>
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between' }}>
          <div>_______________________<br/>Worker Signature</div>
          <div>_______________________<br/>Date Completed</div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
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
            <button onClick={() => window.print()} className="btn-secondary" style={{ marginLeft: 'auto' }}>
              🖨️ Print Work Order
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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

          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '16px' }}>Messaging Thread</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>No messages yet.</div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} style={{ padding: '12px', background: msg.author_type === 'authority' ? 'var(--color-brand-50)' : '#f8fafc', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: msg.author_type === 'authority' ? 'var(--color-brand-600)' : 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      {msg.author_type.toUpperCase()} • {new Date(msg.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>{msg.body}</div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Send an update to the citizen..." 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                style={{ 
                  flexGrow: 1, 
                  padding: '14px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--color-border)', 
                  fontSize: '14px', 
                  outline: 'none', 
                  background: '#f8fafc',
                  color: 'var(--color-text-primary)'
                }} 
              />
              <button 
                type="submit" 
                disabled={!newMessage.trim()} 
                style={{ 
                  padding: '0 24px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: newMessage.trim() ? 'var(--color-brand-600)' : '#e2e8f0', 
                  color: newMessage.trim() ? 'white' : '#94a3b8', 
                  fontWeight: 600, 
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Action Panel & Timeline */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="action-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Authority Action</h2>
              {issue.sla_deadline && <SLARiskBadge deadline={issue.sla_deadline} />}
            </div>

            {issue.status === 'routed' && (
              <div>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Assign a contractor or acknowledge this issue to start work.
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={actionLoading}
                    style={{ flex: 1, padding: '12px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Start Work
                  </button>
                  <button 
                    onClick={() => setShowAssignModal(true)}
                    disabled={actionLoading}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Assign Work Order
                  </button>
                </div>
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
                
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
                
                {actionError && <div style={{ color: 'var(--color-error)', fontSize: '13px', marginBottom: '12px' }}>{actionError}</div>}
                
                <button 
                  onClick={() => handleUpdateStatus('resolved')}
                  disabled={actionLoading}
                  style={{ width: '100%', padding: '12px', background: 'var(--color-success)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
                >
                  {actionLoading ? <LoadingSpinner size={18} /> : (isOnline ? '✅ Submit for Verification' : '💾 Save Offline')}
                </button>
              </div>
            )}

            {/* Verifier outcome banners — each distinct state gets its own visual */}
            {(issue.status === 'resolved' || issue.status === 'verifying') && (
              <div style={{ background: 'hsl(217 91% 97%)', border: '1px solid hsl(217 91% 80%)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <h3 style={{ color: '#1e40af', fontSize: '14px', fontWeight: 600 }}>Awaiting AI Verification</h3>
                <p style={{ color: '#1d4ed8', fontSize: '13px', marginTop: '4px' }}>The Verifier Agent is comparing before/after photos. This usually takes under 60 seconds.</p>
              </div>
            )}

            {(issue.status === 'verified_resolved' || issue.status === 'closed') && (
              <div style={{ background: 'hsl(142 71% 97%)', border: '1px solid hsl(142 71% 80%)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                <h3 style={{ color: '#166534', fontSize: '14px', fontWeight: 600 }}>AI Verified — Issue Resolved</h3>
                <p style={{ color: '#15803d', fontSize: '13px', marginTop: '4px' }}>The AI Verifier confirmed the resolution from the photo evidence. Great work!</p>
              </div>
            )}

            {issue.status === 'inconclusive' && (
              <div style={{ background: 'hsl(48 96% 97%)', border: '1px solid hsl(48 96% 70%)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                <h3 style={{ color: '#92400e', fontSize: '14px', fontWeight: 600 }}>Verification Inconclusive</h3>
                <p style={{ color: '#78350f', fontSize: '13px', marginTop: '4px' }}>The AI could not confirm the fix from the photos. The citizen has been asked to confirm. Consider uploading a clearer photo.</p>
              </div>
            )}

            {issue.status === 'disputed_resolution' && (
              <div style={{ background: 'hsl(0 86% 97%)', border: '1px solid hsl(0 86% 80%)', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔄</div>
                <h3 style={{ color: '#991b1b', fontSize: '14px', fontWeight: 600 }}>Citizen Disputed the Resolution</h3>
                <p style={{ color: '#7f1d1d', fontSize: '13px', marginTop: '4px' }}>The citizen says the issue is not fixed. This ticket has been re-routed to your department for follow-up action.</p>
              </div>
            )}
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Issue Timeline</h3>
            <StatusTimeline currentStatus={issue.status} history={issue.status_history} />
          </div>
        </div>
      </div>

      {showAssignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px' }}>
            <h3>Assign Work Order</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Enter the name of the contractor or field worker for this issue.</p>
            <input type="text" className="input-field" placeholder="Worker / Contractor Name" value={contractorName} onChange={e => setContractorName(e.target.value)} style={{ width: '100%', marginBottom: '16px' }} />
            {actionError && <div style={{ color: 'red', fontSize: '12px', marginBottom: '12px' }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAssign} disabled={actionLoading || !contractorName.trim()}>
                {actionLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
