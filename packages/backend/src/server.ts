import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import { config } from './config/env.js';
import { globalErrorHandler } from './middleware/errorHandler.js';

// Route imports
import authRouter from './routes/auth.js';
import issuesRouter from './routes/issues.js';
import authorityRouter from './routes/authority.js';
import adminRouter from './routes/admin.js';
import mapRouter from './routes/map.js';
import internalRouter from './routes/internal.js';
import demoAuthRouter from './routes/demo-auth.js';
import devRouter from './routes/dev.js';

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
app.use('/api/v1/authority', authorityRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/map', mapRouter);
app.use('/api/v1/dev', devRouter);

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

// Start server
app.listen(config.port, '0.0.0.0', () => {
  console.log(`[SERVER] CivicMind backend API running on port ${config.port} in ${config.nodeEnv} mode`);
  console.log(`[SERVER] Phase 2 agents active: Reporter, Validator, Router, Verifier, Escalation`);
});

export default app;
