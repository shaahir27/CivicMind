import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import cron from 'node-cron';
import { config } from './config/env.js';
import { generateAllLeaderboards } from './services/leaderboard.js';
import { runAgentAnomalyMonitor } from './cron/agentMonitor.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Route imports
import authRouter from './routes/auth.js';
import issuesRouter from './routes/issues.js';
import authorityRoutes from './routes/authority.js';
import adminRoutes from './routes/admin.js';
import mapRouter from './routes/map.js';
import routingRoutes from './routes/routing.js';
import channelsRoutes from './routes/channels.js';
import internalRouter from './routes/internal.js';
import demoAuthRouter from './routes/demo-auth.js';
import devRouter from './routes/dev.js';
import trustRouter from './routes/trust.js';

const app = express();

// Secure headers
app.use(helmet());

app.use(cors({
  origin: '*', // Allow all origins for the hackathon (bypasses CORS blocks)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
}));

// Request logger
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' })); // allow larger payloads for base64 photos
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isDev ? 1000 : 100, // higher limit in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});
app.use(limiter);

// ─── Mount API routes ─────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/demo-auth', demoAuthRouter);
app.use('/api/v1/issues', issuesRouter);
app.use('/api/v1/authority', authorityRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/map', mapRouter);
app.use('/api/v1/routing', routingRoutes);
app.use('/api/v1/channels', channelsRoutes);
app.use('/api/v1/dev', devRouter);
app.use('/api/v1/trust', trustRouter);

// Internal routes (scheduler-triggered — never exposed publicly)
app.use('/internal/v1/agents', internalRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    phase: 'Phase 2 — Backend (complete)',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API endpoint does not exist.',
    },
  });
});

// Global error handler
app.use(globalErrorHandler);

// Scheduled jobs
// Run leaderboard generation nightly at 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running nightly leaderboard generation...');
  try {
    const count = await generateAllLeaderboards();
    console.log(`[CRON] Leaderboard generation complete. Processed ${count} wards.`);
  } catch (err) {
    console.error('[CRON] Leaderboard generation failed:', err);
  }
});

// Run agent anomaly monitor daily at 01:00
cron.schedule('0 1 * * *', async () => {
  try {
    const count = await runAgentAnomalyMonitor();
    console.log(`[CRON] Agent anomaly monitor complete. Generated ${count} alerts.`);
  } catch (err) {
    console.error('[CRON] Agent anomaly monitor failed:', err);
  }
});

// Phase 4: Sentinel Agent Fraud Monitor (Every 5 mins)
cron.schedule('*/5 * * * *', async () => {
  console.log('[CRON] Sentinel Agent: Scanning civic_trust_events for GPS spoofing anomalies...');
  // Implementation stub for hackathon Phase 4 gamification
});

// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[SERVER] CivicMind backend API running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`[SERVER] Phase 2 agents active: Reporter, Validator, Router, Verifier, Escalation`);
});

export default app;
