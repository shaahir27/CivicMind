import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
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
export function StatusBadge({ status, size = 'md' }) {
    const label = STATUS_LABELS[status] ?? status;
    const icon = getStatusIcon(status);
    return (_jsxs("span", { className: "status-badge", "data-status": status, style: size === 'sm' ? { fontSize: 'var(--text-xs)', minHeight: 'unset', padding: '2px 8px' } : {}, children: [icon, " ", label] }));
}
function getStatusIcon(status) {
    const map = {
        submitted: '📋', validating: '🔍', duplicate_candidate: '🔗',
        routing: '📡', routed: '📬', in_progress: '🔧',
        escalated: '⚠️', publicly_escalated: '📢',
        resolved: '✅', verifying: '🔬',
        verified_resolved: '✅', disputed_resolution: '❌',
        inconclusive: '❓', closed: '🏁',
    };
    return map[status] ?? '•';
}
export function ConfidenceIndicator({ score, label }) {
    const level = score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low';
    const colorMap = {
        high: 'var(--color-success)',
        medium: 'var(--color-warning)',
        low: 'var(--color-error)',
    };
    const color = colorMap[level];
    return (_jsxs("span", { style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-medium)',
            color,
        }, title: `AI confidence: ${Math.round(score * 100)}%`, children: [_jsx("span", { style: { display: 'flex', gap: '2px' }, children: [0, 1, 2].map((i) => (_jsx("span", { style: {
                        display: 'inline-block',
                        width: '5px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: i < (level === 'high' ? 3 : level === 'medium' ? 2 : 1) ? color : 'var(--color-neutral-200)',
                    } }, i))) }), label ?? `AI: ${level}`] }));
}
// Canonical ordered stages for the timeline display
const TIMELINE_STAGES = [
    { status: 'submitted', label: 'Submitted' },
    { status: 'validating', label: 'Validating' },
    { status: 'routed', label: 'Routed to Dept.' },
    { status: 'in_progress', label: 'In Progress' },
    { status: 'resolved', label: 'Resolved' },
    { status: 'verifying', label: 'Verifying' },
    { status: 'verified_resolved', label: 'Verified ✓' },
];
export function StatusTimeline({ currentStatus, history, compact = false }) {
    // Build which stages are completed
    const completedStatuses = new Set(history.map((h) => h.to_status));
    const steps = TIMELINE_STAGES.map((stage) => {
        const historyEntry = history.find((h) => h.to_status === stage.status);
        return {
            status: stage.status,
            label: stage.label,
            timestamp: historyEntry?.created_at,
            reason: historyEntry?.reason,
            isCompleted: completedStatuses.has(stage.status) && stage.status !== currentStatus,
            isActive: stage.status === currentStatus,
        };
    });
    // Special states that break the linear flow
    const isEscalated = currentStatus === 'escalated' || currentStatus === 'publicly_escalated';
    const isDisputed = currentStatus === 'disputed_resolution' || currentStatus === 'inconclusive';
    if (compact) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }, children: steps.map((step, i) => (_jsxs(React.Fragment, { children: [_jsx("div", { style: {
                            width: '10px', height: '10px', borderRadius: '50%',
                            backgroundColor: step.isActive
                                ? 'var(--color-brand-500)'
                                : step.isCompleted
                                    ? 'var(--color-success)'
                                    : 'var(--color-neutral-200)',
                            flexShrink: 0,
                        }, title: step.label }), i < steps.length - 1 && (_jsx("div", { style: { flex: 1, minWidth: '8px', height: '2px', backgroundColor: step.isCompleted ? 'var(--color-success)' : 'var(--color-neutral-200)' } }))] }, step.status))) }));
    }
    return (_jsxs("div", { style: { position: 'relative' }, children: [(isEscalated || isDisputed) && (_jsx("div", { style: {
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '12px',
                    backgroundColor: isDisputed ? 'hsl(0 84% 55% / 0.08)' : 'hsl(36 100% 50% / 0.08)',
                    border: `1px solid ${isDisputed ? 'hsl(0 84% 55% / 0.25)' : 'hsl(36 100% 50% / 0.25)'}`,
                    fontSize: 'var(--text-sm)',
                    color: isDisputed ? 'var(--color-status-disputed)' : 'var(--color-status-escalated)',
                    fontWeight: 'var(--font-medium)',
                }, children: isDisputed ? '❌ Resolution Disputed — Issue Reopened' : '⚠️ Escalated — Elevated for Priority Response' })), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0' }, children: steps.map((step, idx) => (_jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', gap: '12px' }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '20px' }, children: [_jsx("div", { style: {
                                        width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                        backgroundColor: step.isActive
                                            ? 'var(--color-brand-500)'
                                            : step.isCompleted
                                                ? 'var(--color-success)'
                                                : 'var(--color-neutral-200)',
                                        border: step.isActive ? '2px solid var(--color-brand-300)' : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '10px', color: 'white',
                                        boxShadow: step.isActive ? '0 0 0 3px hsl(220 87% 53% / 0.2)' : 'none',
                                        transition: 'all 0.2s',
                                    }, children: step.isCompleted ? '✓' : step.isActive ? '●' : '' }), idx < steps.length - 1 && (_jsx("div", { style: {
                                        width: '2px', height: '32px',
                                        backgroundColor: step.isCompleted ? 'var(--color-success)' : 'var(--color-neutral-200)',
                                    } }))] }), _jsxs("div", { style: { paddingBottom: idx < steps.length - 1 ? '0' : '0', paddingTop: '2px', minHeight: '52px' }, children: [_jsx("div", { style: {
                                        fontWeight: step.isActive ? 'var(--font-semibold)' : 'var(--font-normal)',
                                        fontSize: 'var(--text-sm)',
                                        color: step.isActive
                                            ? 'var(--color-text-primary)'
                                            : step.isCompleted
                                                ? 'var(--color-text-secondary)'
                                                : 'var(--color-text-muted)',
                                    }, children: step.label }), step.timestamp && (_jsx("div", { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }, children: formatRelativeTime(step.timestamp) })), step.reason && (_jsx("div", { style: { fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }, children: step.reason }))] })] }, step.status))) })] }));
}
export function MapPlaceholder({ pins = [], onPinClick, height = '100%', interactive = true }) {
    // Google Maps will be integrated here via VITE_GOOGLE_MAPS_KEY
    // Without key, render a styled placeholder that still shows pin counts
    const mapsKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GOOGLE_MAPS_KEY : undefined;
    const categoryColors = {
        pothole: '#ef4444', streetlight: '#f59e0b', garbage: '#8b5cf6',
        water_leakage: '#3b82f6', traffic_signal: '#10b981', drainage: '#06b6d4',
        road_damage: '#f97316', other: '#6b7280',
    };
    return (_jsxs("div", { style: {
            height,
            background: 'linear-gradient(135deg, hsl(220 20% 95%), hsl(200 30% 90%))',
            borderRadius: 'var(--radius-lg)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }, children: [_jsxs("svg", { style: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("defs", { children: _jsx("pattern", { id: "grid", width: "40", height: "40", patternUnits: "userSpaceOnUse", children: _jsx("path", { d: "M 40 0 L 0 0 0 40", fill: "none", stroke: "hsl(220 20% 80%)", strokeWidth: "1" }) }) }), _jsx("rect", { width: "100%", height: "100%", fill: "url(#grid)" })] }), _jsxs("svg", { style: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }, xmlns: "http://www.w3.org/2000/svg", children: [_jsx("line", { x1: "0", y1: "45%", x2: "100%", y2: "45%", stroke: "white", strokeWidth: "3" }), _jsx("line", { x1: "35%", y1: "0", x2: "35%", y2: "100%", stroke: "white", strokeWidth: "3" }), _jsx("line", { x1: "70%", y1: "20%", x2: "70%", y2: "100%", stroke: "white", strokeWidth: "2" }), _jsx("line", { x1: "0", y1: "70%", x2: "100%", y2: "70%", stroke: "white", strokeWidth: "2" })] }), pins.slice(0, 12).map((pin, i) => {
                // Distribute pins across the "map" pseudo-randomly but deterministically
                const x = 10 + ((i * 17 + 5) % 80);
                const y = 10 + ((i * 23 + 13) % 75);
                const color = categoryColors[pin.category] ?? '#6b7280';
                return (_jsx("button", { onClick: () => onPinClick?.(pin), title: `${CATEGORY_LABELS[pin.category] ?? pin.category} — ${STATUS_LABELS[pin.status] ?? pin.status}`, style: {
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
                    }, children: _jsx("span", { style: { transform: 'rotate(45deg)', display: 'block' }, children: CATEGORY_ICONS[pin.category] ?? '📍' }) }, pin.id));
            }), _jsxs("div", { style: {
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
                }, children: ["\uD83D\uDDFA\uFE0F ", mapsKey ? 'Loading map…' : `Map View • ${pins.length} issue${pins.length !== 1 ? 's' : ''} nearby`] }), pins.length > 0 && (_jsx("div", { style: {
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
                }, children: Array.from(new Set(pins.map((p) => p.category))).slice(0, 4).map((cat) => (_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: '3px' }, children: [_jsx("span", { style: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: categoryColors[cat] ?? '#6b7280', display: 'inline-block' } }), CATEGORY_ICONS[cat]] }, cat))) }))] }));
}
export function CategoryChip({ category, confidence, outlined = false, onClick }) {
    return (_jsxs("button", { onClick: onClick, style: {
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
        }, children: [_jsx("span", { children: CATEGORY_ICONS[category] ?? '📌' }), _jsx("span", { children: CATEGORY_LABELS[category] ?? category }), confidence !== undefined && _jsx(ConfidenceIndicator, { score: confidence })] }));
}
export function SeverityChip({ severity, confidence, onClick }) {
    const colorMap = {
        low: 'var(--color-severity-low)',
        medium: 'var(--color-severity-medium)',
        high: 'var(--color-severity-high)',
        critical: 'var(--color-severity-critical)',
    };
    const bgMap = {
        low: 'hsl(142 71% 42% / 0.12)',
        medium: 'hsl(36 100% 50% / 0.12)',
        high: 'hsl(22 100% 48% / 0.12)',
        critical: 'hsl(0 84% 55% / 0.12)',
    };
    return (_jsxs("button", { onClick: onClick, style: {
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
        }, children: ["\uD83D\uDD34 ", SEVERITY_LABELS[severity] ?? severity, confidence !== undefined && _jsx(ConfidenceIndicator, { score: confidence })] }));
}
export function EmptyState({ icon, title, description, action }) {
    return (_jsxs("div", { style: {
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-6)',
            color: 'var(--color-text-muted)',
        }, children: [_jsx("div", { style: { fontSize: '3rem', marginBottom: 'var(--space-4)' }, children: icon }), _jsx("h3", { style: { fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }, children: title }), _jsx("p", { style: { fontSize: 'var(--text-sm)', maxWidth: '300px', margin: '0 auto', marginBottom: action ? 'var(--space-4)' : 0 }, children: description }), action] }));
}
// ─── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 24 }) {
    return (_jsx("div", { style: {
            width: size, height: size,
            borderRadius: '50%',
            border: `3px solid var(--color-neutral-200)`,
            borderTopColor: 'var(--color-brand-500)',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
        } }));
}
export function Toast({ message, type = 'info', onDismiss }) {
    const iconMap = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const colorMap = {
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        warning: 'var(--color-warning)',
    };
    return (_jsxs("div", { style: {
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
        }, children: [iconMap[type], " ", message, onDismiss && (_jsx("button", { onClick: onDismiss, style: { marginLeft: 'auto', color: 'var(--color-text-muted)', fontWeight: 'bold' }, children: "\u00D7" }))] }));
}
export function SLARiskBadge({ deadline, size = 'md' }) {
    if (!deadline)
        return null;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const msLeft = deadlineDate.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    let label;
    let color;
    let bg;
    if (msLeft < 0) {
        label = 'SLA Breached';
        color = 'var(--color-error)';
        bg = 'hsl(0 84% 55% / 0.12)';
    }
    else if (hoursLeft < 2) {
        label = `${Math.round(hoursLeft * 60)}m left`;
        color = 'var(--color-status-escalated)';
        bg = 'hsl(36 100% 50% / 0.12)';
    }
    else if (hoursLeft < 24) {
        label = `${Math.round(hoursLeft)}h left`;
        color = 'var(--color-status-at-risk)';
        bg = 'hsl(36 100% 50% / 0.08)';
    }
    else {
        const days = Math.floor(hoursLeft / 24);
        label = `${days}d left`;
        color = 'var(--color-text-muted)';
        bg = 'var(--color-neutral-100)';
    }
    return (_jsxs("span", { style: {
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: size === 'sm' ? '2px 8px' : '4px 10px',
            borderRadius: 'var(--radius-full)',
            fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)',
            fontWeight: 'var(--font-semibold)',
            color, backgroundColor: bg,
            border: `1px solid ${color}40`,
        }, children: ["\u23F1 ", label] }));
}
//# sourceMappingURL=components.js.map