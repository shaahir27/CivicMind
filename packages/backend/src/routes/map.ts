/**
 * Public Map & Forecast Routes — /api/v1/map/*
 * Per api_specification.md §6.
 * No auth required — public read-only endpoints.
 *
 * BR-9.2: Never includes reporter identity or contact info.
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getFirestore, COLLECTIONS } from '../config/firebase.js';
import { IssueCategory, IssueStatus } from '@civicmind/shared';
import type { Issue, HotspotForecast } from '@civicmind/shared';
import type { Request, Response } from 'express';

const router = Router();

// ─── GET /api/v1/map/issues (public) ─────────────────────────────────────────
router.get('/issues', asyncHandler(async (req: Request, res: Response) => {
  const { category, status, bounding_box } = req.query as {
    category?: string;
    status?: string;
    bounding_box?: string; // "lat_min,lng_min,lat_max,lng_max"
  };

  const db = getFirestore();

  // Only show publicly-visible statuses on the map
  const publicStatuses: IssueStatus[] = [
    IssueStatus.Routed,
    IssueStatus.InProgress,
    IssueStatus.Escalated,
    IssueStatus.PubliclyEscalated,
    IssueStatus.VerifiedResolved,
  ];

  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.ISSUES)
    .where('is_canonical', '==', true)
    .where('status', 'in', publicStatuses)
    .limit(200);

  if (category && Object.values(IssueCategory).includes(category as IssueCategory)) {
    query = query.where('category', '==', category);
  }

  if (status && Object.values(IssueStatus).includes(status as IssueStatus)) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query.get();
  let issues = snapshot.docs.map((d) => {
    const issue = d.data() as Issue;
    // BR-9.2: public view — never include reporter identity
    return {
      issue_id: issue.issue_id,
      category: issue.category,
      severity: issue.severity,
      status: issue.status,
      location: { lat: issue.location_lat, lng: issue.location_lng },
      corroboration_count: issue.corroboration_count,
      created_at: issue.created_at,
    };
  });

  // Bounding box filter (client-side after query, for simplicity — can be pre-filtered with Firestore geo queries)
  if (bounding_box) {
    const [latMin, lngMin, latMax, lngMax] = bounding_box.split(',').map(Number);
    if (!isNaN(latMin) && !isNaN(lngMin) && !isNaN(latMax) && !isNaN(lngMax)) {
      issues = issues.filter(
        (i) =>
          i.location.lat >= latMin &&
          i.location.lat <= latMax &&
          i.location.lng >= lngMin &&
          i.location.lng <= lngMax
      );
    }
  }

  res.status(200).json({ issues });
}));

// ─── GET /api/v1/map/hotspot-forecasts (public) ───────────────────────────────
router.get('/hotspot-forecasts', asyncHandler(async (_req: Request, res: Response) => {
  try {
    const db = getFirestore();

    // Only return forecasts where is_public_visible = true (BR from Feature 6)
    // NOTE: Intentionally no orderBy to avoid requiring a composite Firestore index in dev.
    const snapshot = await db
      .collection(COLLECTIONS.HOTSPOT_FORECASTS)
      .where('is_public_visible', '==', true)
      .limit(100)
      .get();

    const forecasts = snapshot.docs.map((d) => {
      const f = d.data() as HotspotForecast;
      return {
        forecast_id: f.forecast_id,
        ward_or_area_id: f.ward_or_area_id,
        predicted_category: f.predicted_category,
        risk_score: f.risk_score,
        generated_at: f.generated_at,
        valid_until: f.valid_until,
      };
    });

    res.status(200).json({ forecasts });
  } catch (err) {
    // Return empty forecasts rather than crashing — collection may not exist yet in dev
    console.warn('[map] /hotspot-forecasts query failed (index may be missing):', err);
    res.status(200).json({ forecasts: [] });
  }
}));

// ─── GET /api/v1/impact-reports (public summary) ─────────────────────────────
router.get('/impact-reports', asyncHandler(async (req: Request, res: Response) => {
  const { ward_or_area_id } = req.query as { ward_or_area_id?: string };

  const db = getFirestore();
  let query: FirebaseFirestore.Query = db
    .collection(COLLECTIONS.IMPACT_REPORTS)
    .orderBy('generated_at', 'desc')
    .limit(20);

  if (ward_or_area_id) {
    query = query.where('ward_or_area_id', '==', ward_or_area_id);
  }

  const snapshot = await query.get();
  res.status(200).json({ reports: snapshot.docs.map((d) => d.data()) });
}));

// ─── GET /api/v1/map/leaderboard (public) ───────────────────────────────────
router.get('/leaderboard', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  // Fetch recent reports to get the latest per ward
  // In a real app we'd want a separate aggregated collection for this,
  // but for the demo we can just fetch the last 200 reports and group in memory.
  const snapshot = await db
    .collection(COLLECTIONS.IMPACT_REPORTS)
    .orderBy('generated_at', 'desc')
    .limit(200)
    .get();

  const latestPerWard = new Map<string, any>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!latestPerWard.has(data.ward_or_area_id)) {
      latestPerWard.set(data.ward_or_area_id, data);
    }
  }

  const leaderboard = Array.from(latestPerWard.values())
    .sort((a, b) => (b.civic_health_score || 0) - (a.civic_health_score || 0));

  res.status(200).json({ leaderboard });
}));

// ─── GET /api/v1/map/transparency-summary (public) ────────────────────────
router.get('/transparency-summary', asyncHandler(async (_req: Request, res: Response) => {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTIONS.IMPACT_REPORTS)
    .orderBy('generated_at', 'desc')
    .limit(200)
    .get();

  const latestPerWard = new Map<string, any>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!latestPerWard.has(data.ward_or_area_id)) {
      latestPerWard.set(data.ward_or_area_id, data);
    }
  }

  let totalResolved = 0;
  let totalIssuesSum = 0;
  let weightedAvgResTimeSum = 0;

  for (const report of latestPerWard.values()) {
    const resolvedInWard = Math.round((report.total_issues || 0) * (report.resolution_rate || 0));
    totalResolved += resolvedInWard;
    totalIssuesSum += (report.total_issues || 0);
    weightedAvgResTimeSum += (report.avg_resolution_hours || 0) * resolvedInWard;
  }

  const overallAvgResTime = totalResolved > 0 ? (weightedAvgResTimeSum / totalResolved) : 0;

  res.status(200).json({
    summary: {
      total_resolved: totalResolved,
      total_reported: totalIssuesSum,
      avg_resolution_hours: overallAvgResTime,
    }
  });
}));

export default router;
