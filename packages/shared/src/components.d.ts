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
interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}
export declare function StatusBadge({ status, size }: StatusBadgeProps): React.JSX.Element;
interface ConfidenceIndicatorProps {
    score: number;
    label?: string;
}
export declare function ConfidenceIndicator({ score, label }: ConfidenceIndicatorProps): React.JSX.Element;
interface StatusTimelineProps {
    currentStatus: string;
    history: Array<{
        to_status: string;
        created_at: string;
        reason?: string | null;
    }>;
    compact?: boolean;
}
export declare function StatusTimeline({ currentStatus, history, compact }: StatusTimelineProps): React.JSX.Element;
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
    center?: {
        lat: number;
        lng: number;
    };
    interactive?: boolean;
}
export declare function MapPlaceholder({ pins, onPinClick, height, interactive }: MapPlaceholderProps): React.JSX.Element;
interface CategoryChipProps {
    category: string;
    confidence?: number;
    outlined?: boolean;
    onClick?: () => void;
}
export declare function CategoryChip({ category, confidence, outlined, onClick }: CategoryChipProps): React.JSX.Element;
interface SeverityChipProps {
    severity: string;
    confidence?: number;
    onClick?: () => void;
}
export declare function SeverityChip({ severity, confidence, onClick }: SeverityChipProps): React.JSX.Element;
interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}
export declare function EmptyState({ icon, title, description, action }: EmptyStateProps): React.JSX.Element;
export declare function LoadingSpinner({ size }: {
    size?: number;
}): React.JSX.Element;
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastProps {
    message: string;
    type?: ToastType;
    onDismiss?: () => void;
}
export declare function Toast({ message, type, onDismiss }: ToastProps): React.JSX.Element;
interface SLARiskBadgeProps {
    deadline: string | null;
    size?: 'sm' | 'md';
}
export declare function SLARiskBadge({ deadline, size }: SLARiskBadgeProps): React.JSX.Element | null;
export {};
//# sourceMappingURL=components.d.ts.map