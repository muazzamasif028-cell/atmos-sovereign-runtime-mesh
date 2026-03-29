import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { logger } from './core/logger';
import { db } from './db/schema';
import { redisClient } from './queue/job-queue';
import workflowRoutes from './api/workflows';
import integrationRoutes from './api/integrations';
import executionRoutes from './api/executions';
import authRoutes from './api/auth';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security & middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Global rate limiter — 200 req / 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  })
);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'axon-cloud-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    levels: ['foundation', 'advanced', 'intelligent', 'sovereign'],
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/executions', executionRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Verify DB connectivity
    await db.query('SELECT 1');
    logger.info('PostgreSQL connected');

    // Verify Redis connectivity
    await redisClient.ping();
    logger.info('Redis connected');

    app.listen(PORT, () => {
      logger.info(`Axon Cloud backend listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Bootstrap failed', { error: (err as Error).message });
    process.exit(1);
  }
}

bootstrap();
