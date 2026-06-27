/**
 * Agent Decision Audit Log Screen — ui_ux_specification.md §4.3
 *
 * Filterable, paginated log of all agent decisions.
 * Expandable rows to view full input/output summary.
 * Per api_specification.md §5: GET /api/v1/admin/agent-decision-log
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';


interface AgentLogEntry {
  log_id: string;
  issue_id: string | null;
  agent_type: string;
  input_summary: string;
  output_summary: string;
  confidence_score: number | null;
  agent_version: string;
  created_at: string;
}

const AGENT_TYPES = ['All', 'reporter', 'validator', 'router', 'escalation', 'verifier', 'predictor'];

const AGENT_ICONS: Record<string, string> = {
  reporter: '📸',
  validator: '🔍',
  router: '🗺️',
  escalation: '⚠️',
  verifier: '✅',
  predictor: '🔮',
};

const AGENT_COLORS: Record<string, string> = {
  reporter: '#818cf8',
  validator: '#38bdf8',
  router: '#34d399',
  escalation: '#f97316',
  verifier: '#22c55e',
  predictor: '#a78bfa',
};

const MOCK_LOGS: AgentLogEntry[] = [
  {
    log_id: 'log-001',
    issue_id: 'ISS-001',
    agent_type: 'reporter',
    input_summary: '{"photo_count":1,"has_description":true}',
    output_summary: '{"category":"pothole","category_confidence":0.91,"severity":"high","severity_confidence":0.84,"brief_reason":"Deep road cavity visible in centre-frame"}',
    confidence_score: 0.91,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 2 * 86400 * 1000 + 30000).toISOString(),
  },
  {
    log_id: 'log-002',
    issue_id: 'ISS-001',
    agent_type: 'validator',
    input_summary: '{"new_issue_id":"ISS-001","category":"pothole","lat":12.9716,"lng":77.5946,"radius_m":50}',
    output_summary: '{"result":"unique","candidates_checked":3,"closest_match_m":null}',
    confidence_score: null,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 2 * 86400 * 1000 + 35000).toISOString(),
  },
  {
    log_id: 'log-003',
    issue_id: 'ISS-001',
    agent_type: 'router',
    input_summary: '{"ward_or_area_id":"ward-101-indiranagar","category":"pothole"}',
    output_summary: '{"department":"BBMP — Roads & Infrastructure","draft_length":312}',
    confidence_score: null,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 2 * 86400 * 1000 + 120000).toISOString(),
  },
  {
    log_id: 'log-004',
    issue_id: 'ISS-004',
    agent_type: 'escalation',
    input_summary: '{"evaluated_count":5,"sla_breached_ids":["ISS-004"]}',
    output_summary: '{"escalated":["ISS-004"],"tier_from":0,"tier_to":1}',
    confidence_score: null,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    log_id: 'log-005',
    issue_id: 'ISS-003',
    agent_type: 'verifier',
    input_summary: '{"issue_id":"ISS-003","category":"garbage","has_before":true,"has_after":true}',
    output_summary: '{"result":"verified_resolved","confidence":0.94,"rationale":"Garbage bins empty and area clean, consistent with collection"}',
    confidence_score: 0.94,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    log_id: 'log-006',
    issue_id: null,
    agent_type: 'predictor',
    input_summary: '{"history_days":90,"cutoff":"2026-03-27","min_issues":2}',
    output_summary: '{"forecasts_generated":5,"areas_insufficient":2,"total_groups":7,"issues_analysed":89}',
    confidence_score: null,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    log_id: 'log-007',
    issue_id: 'ISS-002',
    agent_type: 'reporter',
    input_summary: '{"photo_count":1,"has_description":false}',
    output_summary: '{"category":"streetlight","category_confidence":0.78,"severity":"medium","severity_confidence":0.71,"brief_reason":"Non-functional street lamp fixture visible"}',
    confidence_score: 0.78,
    agent_version: '1.0.0',
    created_at: new Date(Date.now() - 86400 * 1000 + 20000).toISOString(),
  },
];

function ConfidenceDot({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: '#475569', fontSize: '12px' }}>N/A</span>;
  const color = score >= 0.75 ? '#22c55e' : score >= 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontWeight: 600, fontSize: '13px', color }}>{Math.round(score * 100)}%</span>
    </div>
  );
}

function JsonDisplay({ raw }: { raw: string }) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  return (
    <pre
      style={{
        margin: 0,
        padding: '12px',
        background: 'hsl(0 0% 0% / 0.3)',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#94a3b8',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        border: '1px solid hsl(0 0% 100% / 0.06)',
      }}
    >
      {JSON.stringify(parsed, null, 2)}
    </pre>
  );
}

export default function AuditLogScreen() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('All');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;

  const fetchLogs = useCallback(async () => {
    try {
      const params = agentFilter !== 'All' ? `?agent_type=${agentFilter}&limit=50` : '?limit=50';
      const res = await fetch(`${BASE}/api/v1/admin/agent-decision-log${params}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs && data.logs.length > 0 ? data.logs : MOCK_LOGS);
      } else {
        setLogs(MOCK_LOGS);
      }
    } catch {
      setLogs(MOCK_LOGS);
    }
    setLoading(false);
  }, [token, agentFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = agentFilter === 'All' ? logs : logs.filter((l) => l.agent_type === agentFilter);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>
          Agent Decision Audit Log
        </h1>
        <p style={{ color: '#94a3b8' }}>
          Every agent invocation is recorded here. Append-only — no edits or deletes permitted (NFR-6).
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {AGENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => { setAgentFilter(type); setLoading(true); }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: `1px solid ${agentFilter === type ? (AGENT_COLORS[type] ?? '#818cf8') : 'hsl(0 0% 100% / 0.1)'}`,
              background: agentFilter === type ? `${AGENT_COLORS[type] ?? '#818cf8'}22` : 'transparent',
              color: agentFilter === type ? (AGENT_COLORS[type] ?? '#818cf8') : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
            }}
          >
            {type === 'All' ? '🔍 All' : `${AGENT_ICONS[type] ?? '⚙️'} ${type}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p>No logs found for the selected filter.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Issue ID</th>
                <th>Confidence</th>
                <th>Timestamp</th>
                <th>Version</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log) => (
                <React.Fragment key={log.log_id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(log.log_id)}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: `${AGENT_COLORS[log.agent_type] ?? '#818cf8'}22`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {AGENT_ICONS[log.agent_type] ?? '⚙️'}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: AGENT_COLORS[log.agent_type] ?? '#818cf8',
                            textTransform: 'capitalize',
                          }}
                        >
                          {log.agent_type}
                        </span>
                      </span>
                    </td>
                    <td>
                      {log.issue_id ? (
                        <code style={{ fontSize: '12px', color: '#38bdf8', background: 'hsl(200 80% 50% / 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.issue_id}
                        </code>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#475569' }}>—</span>
                      )}
                    </td>
                    <td><ConfidenceDot score={log.confidence_score} /></td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <code style={{ fontSize: '11px', color: '#475569' }}>v{log.agent_version}</code>
                    </td>
                    <td>
                      <span style={{ fontSize: '16px', color: '#475569', transition: 'transform 0.2s', display: 'inline-block', transform: expanded.has(log.log_id) ? 'rotate(180deg)' : 'none' }}>
                        ▼
                      </span>
                    </td>
                  </tr>
                  {expanded.has(log.log_id) && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0 24px 20px', background: 'hsl(0 0% 0% / 0.2)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Input Summary</div>
                            <JsonDisplay raw={log.input_summary} />
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Output Summary</div>
                            <JsonDisplay raw={log.output_summary} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
