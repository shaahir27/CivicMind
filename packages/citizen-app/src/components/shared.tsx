/**
 * CivicMind — Shared React UI Components
 * Implements ui_ux_specification.md §5 shared components.
 * Used by all three frontend surfaces (copy-referenced per app).
 */

import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { STATUS_LABELS, CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_LABELS, formatRelativeTime } from '@civicmind/shared';


// ─── StatusBadge ──────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
  submitted: '📋', validating: '🔍', duplicate_candidate: '🔗',
  routing: '📡', routed: '📬', in_progress: '🔧',
  escalated: '⚠️', publicly_escalated: '📢',
  resolved: '✅', verifying: '🔬',
  verified_resolved: '🏅', disputed_resolution: '❌',
  inconclusive: '❓', closed: '🏁',
};

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const label = (STATUS_LABELS as Record<string, string>)[status] ?? status;
  return (
    <span
      className="status-badge"
      data-status={status}
      style={size === 'sm' ? { fontSize: '11px', minHeight: 'unset', padding: '2px 8px', lineHeight: '1.4' } : {}}
    >
      {STATUS_ICONS[status] ?? '•'} {label}
    </span>
  );
}

// ─── ConfidenceIndicator ──────────────────────────────────────────────────────

export function ConfidenceIndicator({ score, label }: { score: number; label?: string }) {
  const level = score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  const colorMap = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };
  const color = colorMap[level];
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;

  return (
    <span
      title={`AI confidence: ${Math.round(score * 100)}%`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color }}
    >
      <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'inline-block', width: '4px',
              height: `${8 + i * 4}px`,
              borderRadius: '2px',
              backgroundColor: i < filled ? color : '#e2e8f0',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </span>
      {label ?? `AI: ${level}`}
    </span>
  );
}

// ─── StatusTimeline ───────────────────────────────────────────────────────────

const TIMELINE_STAGES: Array<{ status: string; label: string }> = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'validating', label: 'Validating' },
  { status: 'routed', label: 'Routed to Dept.' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved', label: 'Authority Resolved' },
  { status: 'verifying', label: 'AI Verifying' },
  { status: 'verified_resolved', label: 'Verified ✓' },
];

export function StatusTimeline({
  currentStatus,
  history,
  compact = false,
}: {
  currentStatus: string;
  history: Array<{ to_status: string; created_at: string; reason?: string | null }>;
  compact?: boolean;
}) {
  const completedStatuses = new Set(history.map((h) => h.to_status));
  const isEscalated = currentStatus === 'escalated' || currentStatus === 'publicly_escalated';
  const isDisputed = currentStatus === 'disputed_resolution' || currentStatus === 'inconclusive';

  const STAGE_ORDER: Record<string, number> = {
    submitted: 0, validating: 1, duplicate_candidate: 1,
    routing: 2, routed: 3,
    escalated: 3.5, publicly_escalated: 3.5,
    in_progress: 4,
    resolved: 5, verifying: 6,
    disputed_resolution: 6.5, inconclusive: 7,
    verified_resolved: 8, closed: 8
  };

  const currentOrder = STAGE_ORDER[currentStatus] ?? -1;

  const steps = TIMELINE_STAGES.map((stage) => {
    const entry = history.find((h) => h.to_status === stage.status);
    const stageOrder = STAGE_ORDER[stage.status] ?? -1;
    
    // Logically complete previous steps even if missing from history (e.g. seeded data)
    const logicallyCompleted = stageOrder > -1 && currentOrder > -1 && stageOrder < currentOrder;
    const isCompleted = (completedStatuses.has(stage.status) || logicallyCompleted) && stage.status !== currentStatus;
    
    // If current status is not in TIMELINE_STAGES (e.g. escalated), we don't highlight any stage as active
    const isActive = stage.status === currentStatus;

    return {
      ...stage,
      timestamp: entry?.created_at,
      reason: entry?.reason,
      isCompleted,
      isActive,
    };
  });

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.status}>
            <div
              title={step.label}
              style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: step.isActive ? '#3b82f6' : step.isCompleted ? '#22c55e' : '#e2e8f0',
              }}
            />
            {i < steps.length - 1 && (
              <div style={{ flex: 1, minWidth: '6px', height: '2px', backgroundColor: step.isCompleted ? '#22c55e' : '#e2e8f0' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div>
      {(isEscalated || isDisputed) && (
        <div
          style={{
            padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
            backgroundColor: isDisputed ? 'hsl(0 84% 55% / 0.08)' : 'hsl(36 100% 50% / 0.08)',
            border: `1px solid ${isDisputed ? '#fca5a5' : '#fcd34d'}`,
            fontSize: '13px', fontWeight: 500,
            color: isDisputed ? '#dc2626' : '#d97706',
          }}
        >
          {isDisputed ? '❌ Resolution Disputed — Issue Reopened' : '⚠️ Escalated — Elevated for Priority Response'}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {steps.map((step, idx) => (
          <div key={step.status} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '20px', flexShrink: 0 }}>
              <div
                style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: step.isActive ? '#3b82f6' : step.isCompleted ? '#22c55e' : '#e2e8f0',
                  border: step.isActive ? '2px solid #93c5fd' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', color: 'white', fontWeight: 700,
                  boxShadow: step.isActive ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none',
                  flexShrink: 0,
                }}
              >
                {step.isCompleted ? '✓' : step.isActive ? '●' : ''}
              </div>
              {idx < steps.length - 1 && (
                <div style={{ width: '2px', height: '36px', backgroundColor: step.isCompleted ? '#22c55e' : '#e2e8f0' }} />
              )}
            </div>
            <div style={{ paddingTop: '1px', flex: 1, paddingBottom: idx < steps.length - 1 ? '0' : '0', minHeight: '56px' }}>
              <div style={{
                fontWeight: step.isActive ? 600 : 400,
                fontSize: '14px',
                color: step.isActive ? '#1e293b' : step.isCompleted ? '#475569' : '#94a3b8',
              }}>
                {step.label}
              </div>
              {step.timestamp && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  {formatRelativeTime(step.timestamp)}
                </div>
              )}
              {step.reason && (
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
                  {step.reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MapPlaceholder ───────────────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  pothole: '#ef4444', streetlight: '#f59e0b', garbage: '#8b5cf6',
  water_leakage: '#3b82f6', traffic_signal: '#10b981', drainage: '#06b6d4',
  road_damage: '#f97316', other: '#6b7280',
};

export interface MapPin {
  id: string; lat: number; lng: number;
  category: string; status: string; severity: string;
}

export function MapPlaceholder({
  pins = [],
  onPinClick,
  height = '100%',
  interactive = true,
  userLocation,
}: {
  pins?: MapPin[];
  onPinClick?: (pin: MapPin) => void;
  height?: string;
  interactive?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}) {
  // Only render pins with valid numeric coordinates
  const validPins = pins.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)
  );

  const center = userLocation
    ? userLocation
    : validPins.length > 0
      ? { lat: validPins[0].lat, lng: validPins[0].lng }
      : { lat: 12.9716, lng: 77.5946 }; // Bengaluru default

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_CLIENT_API_KEY || '';
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_ID || 'd3b7758743582e82a5fdade4';

  return (
    <div style={{ height, position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={13}
          mapId={mapId}
          gestureHandling={interactive ? 'auto' : 'none'}
          disableDefaultUI={!interactive}
        >
          {validPins.map((pin) => {
            const color = CAT_COLORS[pin.category] ?? '#6b7280';
            return (
              <AdvancedMarker
                key={pin.id}
                position={{ lat: pin.lat, lng: pin.lng }}
                onClick={() => onPinClick?.(pin)}
                title={`${(CATEGORY_LABELS as Record<string, string>)[pin.category] ?? pin.category}: ${(STATUS_LABELS as Record<string, string>)[pin.status] ?? pin.status}`}
              >
                <Pin background={color} borderColor="white" glyphColor="white" />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
      
      {validPins.length > 0 && (
        <div
          style={{
            position: 'absolute', bottom: '8px', right: '8px',
            background: 'white', borderRadius: '8px', padding: '6px 10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: '11px',
            display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '180px', zIndex: 2,
          }}
        >
          {Array.from(new Set(validPins.map((p) => p.category))).slice(0, 5).map((cat) => (
            <span key={cat} title={(CATEGORY_LABELS as Record<string, string>)[cat] ?? cat} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: CAT_COLORS[cat] ?? '#6b7280', display: 'inline-block' }} />
              {(CATEGORY_ICONS as Record<string, string>)[cat] ?? ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CategoryChip & SeverityChip ─────────────────────────────────────────────

export function CategoryChip({
  category, confidence, outlined = false, onClick,
}: {
  category: string; confidence?: number; outlined?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default', minHeight: '44px',
        backgroundColor: outlined ? 'transparent' : '#3b82f6',
        color: outlined ? '#2563eb' : 'white',
        border: outlined ? '2px dashed #93c5fd' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {(CATEGORY_ICONS as Record<string, string>)[category] ?? '📌'}
      {' '}{(CATEGORY_LABELS as Record<string, string>)[category] ?? category}
      {confidence !== undefined && <ConfidenceIndicator score={confidence} />}
    </button>
  );
}

const SEV_COLOR: Record<string, string> = {
  low: '#22c55e', medium: '#f59e0b', high: '#f97316', critical: '#ef4444',
};
const SEV_BG: Record<string, string> = {
  low: 'hsl(142 71% 42% / 0.1)', medium: 'hsl(36 100% 50% / 0.1)',
  high: 'hsl(22 100% 48% / 0.1)', critical: 'hsl(0 84% 55% / 0.1)',
};

export function SeverityChip({
  severity, confidence, onClick,
}: {
  severity: string; confidence?: number; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 14px', borderRadius: '9999px', fontSize: '14px', fontWeight: 500,
        cursor: onClick ? 'pointer' : 'default', minHeight: '44px',
        backgroundColor: SEV_BG[severity] ?? '#f1f5f9',
        color: SEV_COLOR[severity] ?? '#64748b',
        border: `1px solid ${SEV_COLOR[severity] ?? '#e2e8f0'}`,
        transition: 'all 0.15s',
      }}
    >
      {severity === 'critical' ? '🚨' : severity === 'high' ? '⬆️' : severity === 'medium' ? '➡️' : '⬇️'}
      {' '}{(SEVERITY_LABELS as Record<string, string>)[severity] ?? severity}
      {confidence !== undefined && <ConfidenceIndicator score={confidence} />}
    </button>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon: string; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: '14px', maxWidth: '280px', margin: '0 auto', marginBottom: action ? '16px' : 0, lineHeight: 1.6 }}>{description}</p>
      {action}
    </div>
  );
}

// ─── LoadingSpinner ────────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid #e2e8f0', borderTopColor: '#3b82f6',
      animation: 'spin 0.7s linear infinite', display: 'inline-block',
    }} />
  );
}

// ─── SLARiskBadge ──────────────────────────────────────────────────────────────

export function SLARiskBadge({ deadline, size = 'md' }: { deadline: string | null; size?: 'sm' | 'md' }) {
  if (!deadline) return null;
  const msLeft = new Date(deadline).getTime() - Date.now();
  const hoursLeft = msLeft / 3600000;
  let label: string, color: string, bg: string;
  if (msLeft < 0) {
    label = '⏱ SLA Breached'; color = '#ef4444'; bg = 'hsl(0 84% 55% / 0.1)';
  } else if (hoursLeft < 2) {
    label = `⏱ ${Math.round(hoursLeft * 60)}m left`; color = '#f97316'; bg = 'hsl(22 100% 48% / 0.1)';
  } else if (hoursLeft < 24) {
    label = `⏱ ${Math.round(hoursLeft)}h left`; color = '#f59e0b'; bg = 'hsl(36 100% 50% / 0.08)';
  } else {
    label = `⏱ ${Math.floor(hoursLeft / 24)}d left`; color = '#94a3b8'; bg = '#f1f5f9';
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: size === 'sm' ? '2px 8px' : '4px 10px',
      borderRadius: '9999px', fontSize: size === 'sm' ? '11px' : '13px',
      fontWeight: 600, color, backgroundColor: bg, border: `1px solid ${color}40`,
    }}>
      {label}
    </span>
  );
}

// ─── Spinner overlay for loading screens ──────────────────────────────────────

export function FullPageSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
      <LoadingSpinner size={40} />
      <span style={{ color: '#94a3b8', fontSize: '14px' }}>Loading…</span>
    </div>
  );
}
