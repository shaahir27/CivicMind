/**
 * CivicMind — Shared React Components
 *
 * Shared components per ui_ux_specification.md §5:
 * - StatusBadge
 * - StatusTimeline
 * - ConfidenceIndicator
 * - MapPlaceholder (Google Maps wrapper with env-guard)
 */

import React from 'react';
import { STATUS_LABELS, CATEGORY_ICONS, CATEGORY_LABELS, SEVERITY_LABELS, formatRelativeTime } from './utils.js';
import type { IssueStatus } from './types/enums.js';

// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const label = STATUS_LABELS[status as IssueStatus] ?? status;
  const icon = getStatusIcon(status);
  return (
    <span
      className="status-badge"
      data-status={status}
      style={size === 'sm' ? { fontSize: 'var(--text-xs)', minHeight: 'unset', padding: '2px 8px' } : {}}
    >
      {icon} {label}
    </span>
  );
}

function getStatusIcon(status: string): string {
  const map: Record<string, string> = {
    submitted: '📋', validating: '🔍', duplicate_candidate: '🔗',
    routing: '📡', routed: '📬', in_progress: '🔧',
    escalated: '⚠️', publicly_escalated: '📢',
    resolved: '✅', verifying: '🔬',
    verified_resolved: '✅', disputed_resolution: '❌',
    inconclusive: '❓', closed: '🏁',
  };
  return map[status] ?? '•';
}

// ─── ConfidenceIndicator ──────────────────────────────────────────────────────

interface ConfidenceIndicatorProps {
  score: number; // 0.0–1.0
  label?: string;
}

export function ConfidenceIndicator({ score, label }: ConfidenceIndicatorProps) {
  const level = score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  const colorMap = {
    high: 'var(--color-success)',
    medium: 'var(--color-warning)',
    low: 'var(--color-error)',
  };
  const color = colorMap[level];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-medium)',
        color,
      }}
      title={`AI confidence: ${Math.round(score * 100)}%`}
    >
      <span style={{ display: 'flex', gap: '2px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: '5px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: i < (level === 'high' ? 3 : level === 'medium' ? 2 : 1) ? color : 'var(--color-neutral-200)',
            }}
          />
        ))}
      </span>
      {label ?? `AI: ${level}`}
    </span>
  );
}

// ─── StatusTimeline ───────────────────────────────────────────────────────────

interface TimelineStep {
  status: string;
  label: string;
  timestamp?: string;
  reason?: string | null;
  isActive?: boolean;
  isCompleted?: boolean;
}

interface StatusTimelineProps {
  currentStatus: string;
  history: Array<{ to_status: string; created_at: string; reason?: string | null }>;
  compact?: boolean;
}

// Canonical ordered stages for the timeline display
const TIMELINE_STAGES: Array<{ status: string; label: string }> = [
  { status: 'submitted', label: 'Submitted' },
  { status: 'validating', label: 'Validating' },
  { status: 'routed', label: 'Routed to Dept.' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'verifying', label: 'Verifying' },
  { status: 'verified_resolved', label: 'Verified ✓' },
];

export function StatusTimeline({ currentStatus, history, compact = false }: StatusTimelineProps) {
  // Build which stages are completed
  const completedStatuses = new Set(history.map((h) => h.to_status));
  const currentStageIndex = TIMELINE_STAGES.findIndex(s => s.status === currentStatus);

  const steps: TimelineStep[] = TIMELINE_STAGES.map((stage, index) => {
    const historyEntry = history.find((h) => h.to_status === stage.status);
    const logicallyCompleted = currentStageIndex > -1 && index < currentStageIndex;
    return {
      status: stage.status,
      label: stage.label,
      timestamp: historyEntry?.created_at,
      reason: historyEntry?.reason,
      isCompleted: (completedStatuses.has(stage.status) || logicallyCompleted) && stage.status !== currentStatus,
      isActive: stage.status === currentStatus,
    };
  });

  // Special states that break the linear flow
  const isEscalated = currentStatus === 'escalated' || currentStatus === 'publicly_escalated';
  const isDisputed = currentStatus === 'disputed_resolution' || currentStatus === 'inconclusive';

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {steps.map((step, i) => (
          <React.Fragment key={step.status}>
            <div
              style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: step.isActive
                  ? 'var(--color-brand-500)'
                  : step.isCompleted
                  ? 'var(--color-success)'
                  : 'var(--color-neutral-200)',
                flexShrink: 0,
              }}
              title={step.label}
            />
            {i < steps.length - 1 && (
              <div style={{ flex: 1, minWidth: '8px', height: '2px', backgroundColor: step.isCompleted ? 'var(--color-success)' : 'var(--color-neutral-200)' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Escalation / Dispute special state banner */}
      {(isEscalated || isDisputed) && (
        <div
          className="status-timeline__banner"
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            backgroundColor: isDisputed ? 'hsl(0 84% 55% / 0.08)' : 'hsl(36 100% 50% / 0.08)',
            border: `1px solid ${isDisputed ? 'hsl(0 84% 55% / 0.25)' : 'hsl(36 100% 50% / 0.25)'}`,
            fontSize: 'var(--text-sm)',
            color: isDisputed ? 'var(--color-status-disputed)' : 'var(--color-status-escalated)',
            fontWeight: 'var(--font-medium)',
          }}
        >
          {isDisputed ? '❌ Resolution Disputed — Issue Reopened' : '⚠️ Escalated — Elevated for Priority Response'}
        </div>
      )}
      <div className="status-timeline">
        {steps.map((step) => {
          let stepClass = 'status-timeline__step';
          if (step.isCompleted) stepClass += ' status-timeline__step--done';
          if (step.isActive) stepClass += ' status-timeline__step--active';
          if (!step.isCompleted && !step.isActive) stepClass += ' status-timeline__step--pending';

          return (
            <div key={step.status} className={stepClass}>
              <div className="status-timeline__dot">
                {step.isCompleted ? <span style={{ color: 'white', fontSize: '10px' }}>✓</span> : step.isActive ? <span style={{ color: 'white', fontSize: '10px' }}>●</span> : null}
              </div>
              <div className="status-timeline__content">
                <div className="status-timeline__label">{step.label}</div>
                {step.timestamp && (
                  <div className="status-timeline__timestamp">{formatRelativeTime(step.timestamp)}</div>
                )}
                {step.reason && (
                  <div className="status-timeline__reason">{step.reason}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MapPlaceholder ───────────────────────────────────────────────────────────

interface MapPin {
  id: string;
  lat: number;
  lng: number;
  category: string;
  status: string;
  severity: string;
}

interface MapPlaceholderProps {
  pins?: MapPin[];
  onPinClick?: (pin: MapPin) => void;
  height?: string;
  center?: { lat: number; lng: number };
  interactive?: boolean;
}

export function MapPlaceholder({ pins = [], onPinClick, height = '100%', interactive = true }: MapPlaceholderProps) {
  // Google Maps will be integrated here via VITE_GOOGLE_MAPS_KEY
  // Without key, render a styled placeholder that still shows pin counts
  const mapsKey = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_KEY : undefined;

  const categoryColors: Record<string, string> = {
    pothole: '#ef4444', streetlight: '#f59e0b', garbage: '#8b5cf6',
    water_leakage: '#3b82f6', traffic_signal: '#10b981', drainage: '#06b6d4',
    road_damage: '#f97316', other: '#6b7280',
  };

  return (
    <div
      style={{
        height,
        background: 'linear-gradient(135deg, hsl(220 20% 95%), hsl(200 30% 90%))',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Grid lines to suggest a map */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(220 20% 80%)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Road-like overlays */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }} xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="45%" x2="100%" y2="45%" stroke="white" strokeWidth="3" />
        <line x1="35%" y1="0" x2="35%" y2="100%" stroke="white" strokeWidth="3" />
        <line x1="70%" y1="20%" x2="70%" y2="100%" stroke="white" strokeWidth="2" />
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="white" strokeWidth="2" />
      </svg>

      {/* Simulated pins */}
      {pins.slice(0, 12).map((pin, i) => {
        // Distribute pins across the "map" pseudo-randomly but deterministically
        const x = 10 + ((i * 17 + 5) % 80);
        const y = 10 + ((i * 23 + 13) % 75);
        const color = categoryColors[pin.category] ?? '#6b7280';
        return (
          <button
            key={pin.id}
            onClick={() => onPinClick?.(pin)}
            title={`${CATEGORY_LABELS[pin.category as keyof typeof CATEGORY_LABELS] ?? pin.category} — ${STATUS_LABELS[pin.status as IssueStatus] ?? pin.status}`}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: '28px',
              height: '28px',
              borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)',
              backgroundColor: color,
              border: '2px solid white',
              boxShadow: '0 2px 6px hsl(0 0% 0% / 0.25)',
              cursor: interactive ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              transition: 'transform 0.15s, box-shadow 0.15s',
              zIndex: 1,
            }}
          >
            <span style={{ transform: 'rotate(45deg)', display: 'block' }}>
              {CATEGORY_ICONS[pin.category as keyof typeof CATEGORY_ICONS] ?? '📍'}
            </span>
          </button>
        );
      })}

      {/* Center label */}
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 14px',
          boxShadow: 'var(--shadow-md)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          zIndex: 2,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: pins.length > 0 ? 0.7 : 1,
        }}
      >
        🗺️ {mapsKey ? 'Loading map…' : `Map View • ${pins.length} issue${pins.length !== 1 ? 's' : ''} nearby`}
      </div>

      {/* Category legend */}
      {pins.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'white',
            borderRadius: 'var(--radius-md)',
            padding: '6px 10px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: 'var(--text-xs)',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            maxWidth: '200px',
            zIndex: 2,
          }}
        >
          {Array.from(new Set(pins.map((p) => p.category))).slice(0, 4).map((cat) => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: categoryColors[cat] ?? '#6b7280', display: 'inline-block' }} />
              {CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CategoryChip ──────────────────────────────────────────────────────────────

interface CategoryChipProps {
  category: string;
  confidence?: number;
  outlined?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ category, confidence, outlined = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: outlined ? 'transparent' : 'var(--color-brand-500)',
        color: outlined ? 'var(--color-brand-600)' : 'white',
        border: outlined ? '2px dashed var(--color-brand-400)' : '2px solid transparent',
        transition: 'all 0.15s',
        minHeight: 'var(--min-touch-target)',
      }}
    >
      <span>{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? '📌'}</span>
      <span>{CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category}</span>
      {confidence !== undefined && <ConfidenceIndicator score={confidence} />}
    </button>
  );
}

// ─── SeverityChip ──────────────────────────────────────────────────────────────

interface SeverityChipProps {
  severity: string;
  confidence?: number;
  onClick?: () => void;
}

export function SeverityChip({ severity, confidence, onClick }: SeverityChipProps) {
  const colorMap: Record<string, string> = {
    low: 'var(--color-severity-low)',
    medium: 'var(--color-severity-medium)',
    high: 'var(--color-severity-high)',
    critical: 'var(--color-severity-critical)',
  };
  const bgMap: Record<string, string> = {
    low: 'hsl(142 71% 42% / 0.12)',
    medium: 'hsl(36 100% 50% / 0.12)',
    high: 'hsl(22 100% 48% / 0.12)',
    critical: 'hsl(0 84% 55% / 0.12)',
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: bgMap[severity] ?? 'var(--color-neutral-100)',
        color: colorMap[severity] ?? 'var(--color-text-primary)',
        border: `1px solid ${colorMap[severity] ?? 'var(--color-border)'}`,
        transition: 'all 0.15s',
        minHeight: 'var(--min-touch-target)',
      }}
    >
      🔴 {SEVERITY_LABELS[severity as keyof typeof SEVERITY_LABELS] ?? severity}
      {confidence !== undefined && <ConfidenceIndicator score={confidence} />}
    </button>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-6)',
        color: 'var(--color-text-muted)',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>{icon}</div>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--text-sm)', maxWidth: '300px', margin: '0 auto', marginBottom: action ? 'var(--space-4)' : 0 }}>
        {description}
      </p>
      {action}
    </div>
  );
}

// ─── LoadingSpinner ────────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        border: `3px solid var(--color-neutral-200)`,
        borderTopColor: 'var(--color-brand-500)',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
}

export function Toast({ message, type = 'info', onDismiss }: ToastProps) {
  const iconMap: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colorMap: Record<ToastType, string> = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    warning: 'var(--color-warning)',
  };
  return (
    <div
      style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '12px 20px',
        boxShadow: 'var(--shadow-xl)',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)',
        color: colorMap[type],
        border: `1px solid ${colorMap[type]}40`,
        zIndex: 'var(--z-toast)',
        minWidth: '200px', maxWidth: '90vw',
        animation: 'slideUp 0.2s ease',
      }}
    >
      {iconMap[type]} {message}
      {onDismiss && (
        <button onClick={onDismiss} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>×</button>
      )}
    </div>
  );
}

// ─── SLARisk Badge ────────────────────────────────────────────────────────────

interface SLARiskBadgeProps {
  deadline: string | null;
  size?: 'sm' | 'md';
}

export function SLARiskBadge({ deadline, size = 'md' }: SLARiskBadgeProps) {
  if (!deadline) return null;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const msLeft = deadlineDate.getTime() - now.getTime();
  const hoursLeft = msLeft / (1000 * 60 * 60);

  let label: string;
  let color: string;
  let bg: string;

  if (msLeft < 0) {
    label = 'SLA Breached';
    color = 'var(--color-error)';
    bg = 'hsl(0 84% 55% / 0.12)';
  } else if (hoursLeft < 2) {
    label = `${Math.round(hoursLeft * 60)}m left`;
    color = 'var(--color-status-escalated)';
    bg = 'hsl(36 100% 50% / 0.12)';
  } else if (hoursLeft < 24) {
    label = `${Math.round(hoursLeft)}h left`;
    color = 'var(--color-status-at-risk)';
    bg = 'hsl(36 100% 50% / 0.08)';
  } else {
    const days = Math.floor(hoursLeft / 24);
    label = `${days}d left`;
    color = 'var(--color-text-muted)';
    bg = 'var(--color-neutral-100)';
  }

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
        color, backgroundColor: bg,
        border: `1px solid ${color}40`,
      }}
    >
      ⏱ {label}
    </span>
  );
}
