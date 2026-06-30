// @ts-nocheck
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import type { IssueSummary, FieldWorker } from '@civicmind/shared';

export default function MyTeamScreen() {
  const { token } = useAuth();
  const [workers, setWorkers] = useState<FieldWorker[]>([]);
  const [issues, setIssues] = useState<IssueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingIssue, setDraggingIssue] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const [workersRes, issuesRes] = await Promise.all([
        fetch(`${base}/api/v1/authority/workers`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${base}/api/v1/authority/issues`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const workersData = await workersRes.json();
      const issuesData = await issuesRes.json();
      setWorkers(workersData.workers || []);
      setIssues(issuesData.issues || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    setDraggingIssue(issueId);
    e.dataTransfer.setData('issueId', issueId);
  };

  const handleDrop = async (e: React.DragEvent, workerId: string | null) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('issueId');
    setDraggingIssue(null);

    if (!issueId || !workerId) return;

    // Optimistic update
    setIssues(prev => prev.map(iss => iss.issue_id === issueId ? { ...iss, assigned_worker_id: workerId } : iss));

    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      await fetch(`${base}/api/v1/authority/issues/${issueId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ worker_id: workerId })
      });
    } catch (err) {
      console.error(err);
      fetchData(); // Revert on fail
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>Loading team...</div>;
  }

  // Group issues by worker
  const unassignedIssues = issues.filter(i => !i.assigned_worker_id);
  const workerColumns = workers.map(w => ({
    ...w,
    issues: issues.filter(i => i.assigned_worker_id === w.worker_id)
  }));

  const renderIssueCard = (issue: IssueSummary) => (
    <div
      key={issue.issue_id}
      draggable
      onDragStart={(e) => handleDragStart(e, issue.issue_id)}
      style={{
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px',
        cursor: 'grab',
        boxShadow: draggingIssue === issue.issue_id ? '0 8px 16px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
        border: '1px solid var(--color-border)',
        opacity: draggingIssue === issue.issue_id ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
        {issue.issue_id.substring(0,8)} • {issue.status}
      </div>
      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px', color: 'var(--color-text-primary)' }}>
        {issue.category}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
        📍 {issue.location.address_text || 'Lat/Lng location'}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>My Team</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>Assign routed issues to field workers by dragging and dropping.</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', flex: 1, paddingBottom: '24px' }}>
        {/* Unassigned Column */}
        <div 
          style={{ minWidth: '300px', width: '300px', background: 'var(--color-bg-secondary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--color-border)' }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Unassigned 
              <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{unassignedIssues.length}</span>
            </h3>
          </div>
          <div 
            style={{ padding: '16px', overflowY: 'auto', flex: 1 }}
          >
            {unassignedIssues.map(renderIssueCard)}
          </div>
        </div>

        {/* Worker Columns */}
        {workerColumns.map(worker => (
          <div 
            key={worker.worker_id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, worker.worker_id)}
            style={{ minWidth: '300px', width: '300px', background: 'var(--color-bg-secondary)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--color-border)' }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-brand-600)' }}>
                  {worker.display_name}
                </h3>
                <span style={{ background: 'var(--color-brand-100)', color: 'var(--color-brand-700)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                  {worker.issues.length}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {worker.skills.map(s => (
                  <span key={s} style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{s}</span>
                ))}
              </div>
            </div>
            <div 
              style={{ padding: '16px', overflowY: 'auto', flex: 1, minHeight: '100px' }}
            >
              {worker.issues.map(renderIssueCard)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
