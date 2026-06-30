/**
 * Internal Agent Routes — /internal/v1/agents/*
 * Per api_specification.md §7.
 *
 * Triggered by the scheduler (Cloud Scheduler or cron job), NOT by frontend clients.
 * Authenticated via INTERNAL_SERVICE_SECRET header, NOT Firebase Auth.
 */

import { Router } from 'express';
import { authenticateInternal } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { runEscalationCycle } from '../agents/escalationAgent.js';
import { runPredictorAgent } from '../agents/predictorAgent.js';
import { generateAllLeaderboards } from '../services/leaderboard.js';
import type { Request, Response } from 'express';

const router = Router();

// All internal routes use the shared secret, not Firebase Auth
router.use(authenticateInternal as any);

// ─── POST /internal/v1/agents/escalation/run-cycle ───────────────────────────
router.post('/escalation/run-cycle', asyncHandler(async (_req: Request, res: Response) => {
  const result = await runEscalationCycle();

  res.status(200).json({
    evaluated_count: result.evaluatedCount,
    escalated_count: result.escalatedCount,
    publicly_escalated_count: result.publiclyEscalatedCount,
  });
}));

// ─── POST /internal/v1/agents/predictor/run-cycle ────────────────────────────
// Phase 4 — Predictor Agent (heuristic/statistical version per system_architecture.md §6).
// Reads historical issue data, generates HotspotForecast documents via geo-clustering.
router.post('/predictor/run-cycle', asyncHandler(async (_req: Request, res: Response) => {
  const result = await runPredictorAgent();

  res.status(200).json({
    forecasts_generated: result.forecastsGenerated,
    areas_with_insufficient_data: result.areasWithInsufficientData,
  });
}));

// ─── POST /internal/v1/agents/leaderboard/run-cycle ──────────────────────────
router.post('/leaderboard/run-cycle', asyncHandler(async (_req: Request, res: Response) => {
  const generatedCount = await generateAllLeaderboards();
  res.status(200).json({ generatedCount });
}));

export default router;
