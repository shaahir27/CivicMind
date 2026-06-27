/**
 * CivicMind — Shared utilities (non-React, safe for both backend and frontend)
 */
import { IssueStatus, IssueSeverity, IssueCategory, SLARisk } from './types/enums.js';
/**
 * Validates whether a status transition is allowed per the canonical
 * state machine in user_flows.md.
 */
export declare function isValidStatusTransition(from: IssueStatus, to: IssueStatus): boolean;
/**
 * Determines if a citizen confirmation is required for the classification
 * result per BR-1.1 (confidence < 0.6 → must confirm manually).
 */
export declare function requiresCitizenConfirmation(categoryConfidence: number): boolean;
export type DuplicateAction = 'auto_merge' | 'prompt_confirm' | 'unique';
/**
 * Determines the duplicate action per BR-2.2 and BR-2.3.
 * ≥ 0.8 → auto_merge, 0.5–0.8 → prompt_confirm, < 0.5 → unique
 */
export declare function getDuplicateAction(confidence: number): DuplicateAction;
/**
 * Computes the SLA deadline timestamp given a routing time and SLA hours.
 */
export declare function computeSLADeadline(routedAt: Date, slaHours: number): Date;
/**
 * Determines SLA risk level per BR-8.1.
 * "At risk" = within 20% of the SLA window remaining.
 */
export declare function computeSLARisk(slaDeadline: Date, now?: Date): SLARisk;
/**
 * Full SLA risk computation with routedAt available.
 */
export declare function computeSLARiskFull(routedAt: Date, slaDeadline: Date, now?: Date): SLARisk;
/** Human-readable label for issue status values */
export declare const STATUS_LABELS: Record<IssueStatus, string>;
/** Human-readable label for severity */
export declare const SEVERITY_LABELS: Record<IssueSeverity, string>;
/** Human-readable label for issue category */
export declare const CATEGORY_LABELS: Record<IssueCategory, string>;
/** Emoji icon for category (used in map pins and badges) */
export declare const CATEGORY_ICONS: Record<IssueCategory, string>;
/**
 * Returns a 3-level confidence level descriptor for the ConfidenceIndicator component.
 */
export declare function getConfidenceLevel(score: number): 'high' | 'medium' | 'low';
/**
 * Formats a duration in milliseconds as human-readable "X hours" or "X days".
 */
export declare function formatDuration(ms: number): string;
/**
 * Formats a timestamp as a relative time string (e.g. "2 hours ago").
 */
export declare function formatRelativeTime(date: Date | string, now?: Date): string;
/**
 * Generates a UUIDv4. Works in both Node and browser.
 */
export declare function generateId(): string;
/**
 * Computes geodesic distance between two coordinates in meters.
 * Uses Haversine formula per database_design.md §2 Validator validation rules.
 */
export declare function geodesicDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number;
/**
 * Checks if a coordinate is within the configured service area bounding box.
 * Used at submission to enforce Error Scenario 5.2.
 */
export declare function isWithinServiceArea(lat: number, lng: number, bbox: {
    lat_min: number;
    lat_max: number;
    lng_min: number;
    lng_max: number;
}): boolean;
//# sourceMappingURL=utils.d.ts.map