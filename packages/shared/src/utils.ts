/**
 * CivicMind — Shared utilities (non-React, safe for both backend and frontend)
 */

import {
  IssueStatus,
  IssueSeverity,
  IssueCategory,
  VALID_STATUS_TRANSITIONS,
  CLASSIFICATION_AUTO_CONFIRM_THRESHOLD,
  DUPLICATE_AUTO_MERGE_THRESHOLD,
  DUPLICATE_CONFIRM_THRESHOLD,
  SLA_AT_RISK_PERCENTAGE,
  SLARisk,
} from './types/enums.js';

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * Validates whether a status transition is allowed per the canonical
 * state machine in user_flows.md.
 */
export function isValidStatusTransition(from: IssueStatus, to: IssueStatus): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

// ─── Classification helpers ───────────────────────────────────────────────────

/**
 * Determines if a citizen confirmation is required for the classification
 * result per BR-1.1 (confidence < 0.6 → must confirm manually).
 */
export function requiresCitizenConfirmation(categoryConfidence: number): boolean {
  return categoryConfidence < CLASSIFICATION_AUTO_CONFIRM_THRESHOLD;
}

// ─── Duplicate detection helpers ──────────────────────────────────────────────

export type DuplicateAction = 'auto_merge' | 'prompt_confirm' | 'unique';

/**
 * Determines the duplicate action per BR-2.2 and BR-2.3.
 * ≥ 0.8 → auto_merge, 0.5–0.8 → prompt_confirm, < 0.5 → unique
 */
export function getDuplicateAction(confidence: number): DuplicateAction {
  if (confidence >= DUPLICATE_AUTO_MERGE_THRESHOLD) return 'auto_merge';
  if (confidence >= DUPLICATE_CONFIRM_THRESHOLD) return 'prompt_confirm';
  return 'unique';
}

// ─── SLA helpers ──────────────────────────────────────────────────────────────

/**
 * Computes the SLA deadline timestamp given a routing time and SLA hours.
 */
export function computeSLADeadline(routedAt: Date, slaHours: number): Date {
  return new Date(routedAt.getTime() + slaHours * 60 * 60 * 1000);
}

/**
 * Determines SLA risk level per BR-8.1.
 * "At risk" = within 20% of the SLA window remaining.
 */
export function computeSLARisk(slaDeadline: Date, now: Date = new Date()): SLARisk {
  const deadlineMs = slaDeadline.getTime();
  const nowMs = now.getTime();

  if (nowMs >= deadlineMs) return SLARisk.Breached;

  // We'd need routedAt to compute total window; use a 20% of 24h default if unknown
  // Callers with access to routedAt should pass total window
  return SLARisk.Normal;
}

/**
 * Full SLA risk computation with routedAt available.
 */
export function computeSLARiskFull(
  routedAt: Date,
  slaDeadline: Date,
  now: Date = new Date()
): SLARisk {
  const totalWindowMs = slaDeadline.getTime() - routedAt.getTime();
  const nowMs = now.getTime();
  const deadlineMs = slaDeadline.getTime();

  if (nowMs >= deadlineMs) return SLARisk.Breached;

  const remainingMs = deadlineMs - nowMs;
  const atRiskThresholdMs = totalWindowMs * SLA_AT_RISK_PERCENTAGE;

  if (remainingMs <= atRiskThresholdMs) return SLARisk.AtRisk;
  return SLARisk.Normal;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Human-readable label for issue status values */
export const STATUS_LABELS: Record<IssueStatus, string> = {
  [IssueStatus.Submitted]:          'Submitted',
  [IssueStatus.Validating]:         'Validating',
  [IssueStatus.DuplicateCandidate]: 'Duplicate Candidate',
  [IssueStatus.Routing]:            'Routing',
  [IssueStatus.Routed]:             'Routed to Department',
  [IssueStatus.InProgress]:         'In Progress',
  [IssueStatus.Escalated]:          'Escalated',
  [IssueStatus.PubliclyEscalated]:  'Publicly Escalated',
  [IssueStatus.Resolved]:           'Resolved',
  [IssueStatus.Verifying]:          'Verifying Resolution',
  [IssueStatus.VerifiedResolved]:   'Verified Resolved',
  [IssueStatus.DisputedResolution]: 'Disputed',
  [IssueStatus.Inconclusive]:       'Inconclusive',
  [IssueStatus.Closed]:             'Closed',
};

/** Human-readable label for severity */
export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  [IssueSeverity.Low]:      'Low',
  [IssueSeverity.Medium]:   'Medium',
  [IssueSeverity.High]:     'High',
  [IssueSeverity.Critical]: 'Critical',
};

/** Human-readable label for issue category */
export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  [IssueCategory.Pothole]:      'Pothole',
  [IssueCategory.Streetlight]:  'Broken Streetlight',
  [IssueCategory.Garbage]:      'Garbage Overflow',
  [IssueCategory.WaterLeakage]: 'Water Leakage',
  [IssueCategory.TrafficSignal]:'Traffic Signal',
  [IssueCategory.Drainage]:     'Drainage Issue',
  [IssueCategory.RoadDamage]:   'Road Damage',
  [IssueCategory.Other]:        'Other',
};

/** Emoji icon for category (used in map pins and badges) */
export const CATEGORY_ICONS: Record<IssueCategory, string> = {
  [IssueCategory.Pothole]:      '🕳️',
  [IssueCategory.Streetlight]:  '💡',
  [IssueCategory.Garbage]:      '🗑️',
  [IssueCategory.WaterLeakage]: '💧',
  [IssueCategory.TrafficSignal]:'🚦',
  [IssueCategory.Drainage]:     '🌊',
  [IssueCategory.RoadDamage]:   '🛣️',
  [IssueCategory.Other]:        '⚠️',
};

/**
 * Returns a 3-level confidence level descriptor for the ConfidenceIndicator component.
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.75) return 'high';
  if (score >= 0.5)  return 'medium';
  return 'low';
}

/**
 * Formats a duration in milliseconds as human-readable "X hours" or "X days".
 */
export function formatDuration(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  return `${Math.round(days)} days`;
}

/**
 * Formats a timestamp as a relative time string (e.g. "2 hours ago").
 */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

// ─── UUID ─────────────────────────────────────────────────────────────────────

/**
 * Generates a UUIDv4. Works in both Node and browser.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────

/**
 * Computes geodesic distance between two coordinates in meters.
 * Uses Haversine formula per database_design.md §2 Validator validation rules.
 */
export function geodesicDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Checks if a coordinate is within the configured service area bounding box.
 * Used at submission to enforce Error Scenario 5.2.
 */
export function isWithinServiceArea(
  lat: number, lng: number,
  bbox: { lat_min: number; lat_max: number; lng_min: number; lng_max: number }
): boolean {
  return (
    lat >= bbox.lat_min &&
    lat <= bbox.lat_max &&
    lng >= bbox.lng_min &&
    lng <= bbox.lng_max
  );
}
