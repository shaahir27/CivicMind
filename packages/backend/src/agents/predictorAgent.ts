/**
 * Predictor Agent
 *
 * Invocation pattern: Scheduled (e.g., weekly), batch.
 * Responsibility: Historical pattern analysis → hotspot forecast generation.
 *
 * Per system_architecture.md §3.2 and §6:
 *   "for hackathon MVP this may be implemented as a clearly-labeled
 *    heuristic/statistical model (e.g., recency- and frequency-weighted
 *    geo-clustering) rather than a fully trained ML model"
 *
 * Per feature_specifications.md Feature 6:
 *   BR-6.1: Forecasts timestamped with "last generated" metadata.
 *   BR-6.2: Minimum historical data volume threshold per area.
 *
 * Algorithm:
 *   1. Fetch all canonical issues created in the past HISTORY_DAYS window.
 *   2. Group by (ward_or_area_id × category).
 *   3. Compute a risk_score = recency_weight × frequency_score.
 *      - frequency_score = issue_count / max_count_in_any_group (normalised 0–1)
 *      - recency_weight  = exponential decay: issues in last 7d count 1.0,
 *        14d → 0.7, 21d → 0.5, older → 0.3
 *   4. Confidence = risk_score × data_sufficiency_factor.
 *   5. is_public_visible = confidence ≥ PUBLIC_CONFIDENCE_THRESHOLD.
 *   6. Write one HotspotForecast doc per (ward × category) group.
 */

import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { writeAuditLog } from '../services/auditLog.js';
import {
  IssueCategory,
  IssueSeverity,
  AgentType,
} from '@civicmind/shared';
import type { Issue, HotspotForecast } from '@civicmind/shared';
import { v4 as uuidv4 } from 'uuid';

const AGENT_VERSION = '1.0.0';

/** Days of history to analyse */
const HISTORY_DAYS = 90;

/**
 * Minimum issues in a (ward × category) group before we publish a forecast.
 * Per BR-6.2 — avoids low-confidence predictions on sparse data.
 */
const MIN_ISSUES_FOR_FORECAST = 2;

/**
 * Confidence threshold above which a forecast becomes public-visible.
 * Admin/authority can see everything; public only sees high-confidence ones.
 */
const PUBLIC_CONFIDENCE_THRESHOLD = 0.5;

/** Valid-for window: forecasts expire after 7 days */
const FORECAST_VALID_DAYS = 7;

/** Severity multipliers for risk scoring */
const SEVERITY_WEIGHTS: Record<IssueSeverity, number> = {
  [IssueSeverity.Critical]: 2.0,
  [IssueSeverity.High]:     1.5,
  [IssueSeverity.Medium]:   1.0,
  [IssueSeverity.Low]:      0.5,
};

export interface PredictorAgentResult {
  forecastsGenerated: number;
  areasWithInsufficientData: number;
  inputSummary: string;
  outputSummary: string;
  agentVersion: string;
}

/** Recency weight: issues get decayed exponentially by age in days */
function recencyWeight(ageDays: number): number {
  if (ageDays <= 7)  return 1.0;
  if (ageDays <= 14) return 0.70;
  if (ageDays <= 30) return 0.50;
  if (ageDays <= 60) return 0.35;
  return 0.20;
}

export async function runPredictorAgent(): Promise<PredictorAgentResult> {
  const db = getFirestore();
  const now = new Date();
  const cutoff = new Date(now.getTime() - HISTORY_DAYS * 24 * 3600 * 1000);
  const cutoffIso = cutoff.toISOString();

  const inputSummary = JSON.stringify({
    history_days: HISTORY_DAYS,
    cutoff: cutoffIso,
    min_issues: MIN_ISSUES_FOR_FORECAST,
  });

  // ─── 1. Fetch historical issues ───────────────────────────────────────────
  let allIssues: Issue[] = [];
  try {
    const snapshot = await db
      .collection(COLLECTIONS.ISSUES)
      .where('is_canonical', '==', true)
      .where('created_at', '>=', cutoffIso)
      .limit(2000)
      .get();
    allIssues = snapshot.docs.map((d) => d.data() as Issue);
  } catch (err) {
    console.warn('[PredictorAgent] Firestore fetch failed, using empty dataset:', err);
    // Graceful degradation — return early with zero forecasts
    return {
      forecastsGenerated: 0,
      areasWithInsufficientData: 0,
      inputSummary,
      outputSummary: JSON.stringify({ reason: 'Firestore unavailable' }),
      agentVersion: AGENT_VERSION,
    };
  }

  // ─── 2. Group by (ward_or_area_id × category) ────────────────────────────
  type GroupKey = `${string}::${string}`;
  const groups = new Map<GroupKey, Array<{ issue: Issue; ageDays: number }>>();

  for (const issue of allIssues) {
    if (!issue.ward_or_area_id || !issue.category) continue;
    const key: GroupKey = `${issue.ward_or_area_id}::${issue.category}`;
    const ageDays =
      (now.getTime() - new Date(issue.created_at).getTime()) / (1000 * 3600 * 24);

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ issue, ageDays });
  }

  // ─── 3. Compute weighted frequency per group ─────────────────────────────
  // Find max weighted count for normalisation
  let maxWeightedCount = 0;
  const groupScores = new Map<GroupKey, number>();

  for (const [key, members] of groups) {
    const weightedCount = members.reduce((sum, { issue, ageDays }) => {
      const severityMult = SEVERITY_WEIGHTS[issue.severity as IssueSeverity] ?? 1.0;
      return sum + recencyWeight(ageDays) * severityMult;
    }, 0);
    groupScores.set(key, weightedCount);
    if (weightedCount > maxWeightedCount) maxWeightedCount = weightedCount;
  }

  // ─── 4. Write forecasts ───────────────────────────────────────────────────
  const batch = db.batch();
  let forecastsGenerated = 0;
  let areasWithInsufficientData = 0;

  // Expire old forecasts first (soft: set valid_until to now)
  try {
    const oldForecasts = await db.collection(COLLECTIONS.HOTSPOT_FORECASTS).get();
    for (const doc of oldForecasts.docs) {
      batch.update(doc.ref, { valid_until: now.toISOString() });
    }
  } catch {
    // Best-effort; don't fail the whole cycle
  }

  for (const [key, members] of groups) {
    if (members.length < MIN_ISSUES_FOR_FORECAST) {
      areasWithInsufficientData++;
      continue;
    }

    const [wardOrAreaId, category] = key.split('::') as [string, string];
    const weightedCount = groupScores.get(key) ?? 0;
    const rawRiskScore = maxWeightedCount > 0 ? weightedCount / maxWeightedCount : 0;

    // Data sufficiency factor: smoothly ramp from 0 at MIN to 1 at 10+ issues
    const dataSufficiency = Math.min(1, (members.length - MIN_ISSUES_FOR_FORECAST) / 8 + 0.2);
    const confidence = Math.min(1, rawRiskScore * dataSufficiency);
    const riskScore = Math.min(1, rawRiskScore);

    const validUntil = new Date(now.getTime() + FORECAST_VALID_DAYS * 24 * 3600 * 1000);
    const forecastId = uuidv4();

    const forecast: HotspotForecast = {
      forecast_id: forecastId,
      ward_or_area_id: wardOrAreaId,
      predicted_category: category as IssueCategory,
      risk_score: parseFloat(riskScore.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(3)),
      is_public_visible: confidence >= PUBLIC_CONFIDENCE_THRESHOLD,
      generated_at: now.toISOString(),
      valid_until: validUntil.toISOString(),
    };

    batch.set(
      db.collection(COLLECTIONS.HOTSPOT_FORECASTS).doc(forecastId),
      forecast
    );
    forecastsGenerated++;
  }

  await batch.commit();

  const outputSummary = JSON.stringify({
    forecasts_generated: forecastsGenerated,
    areas_insufficient: areasWithInsufficientData,
    total_groups: groups.size,
    issues_analysed: allIssues.length,
  });

  // ─── 5. Audit log ─────────────────────────────────────────────────────────
  await writeAuditLog({
    issueId: null,
    agentType: AgentType.Predictor,
    inputSummary,
    outputSummary,
    confidenceScore: null,
    agentVersion: AGENT_VERSION,
  });

  console.log(
    `[PredictorAgent] Generated ${forecastsGenerated} forecasts, ` +
    `${areasWithInsufficientData} groups had insufficient data.`
  );

  return {
    forecastsGenerated,
    areasWithInsufficientData,
    inputSummary,
    outputSummary,
    agentVersion: AGENT_VERSION,
  };
}

export { AGENT_VERSION as PREDICTOR_AGENT_VERSION };
