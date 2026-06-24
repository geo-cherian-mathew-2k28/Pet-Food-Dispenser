// SmartCat Feeder - Express App
// Configures middleware, routes, and error handling.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.router';
import { feedsRouter } from './modules/feeds/feeds.router';
import { schedulesRouter } from './modules/schedules/schedules.router';
import { deviceRouter } from './modules/device/device.router';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();

// ── Security & parsing middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ── Health check (no auth needed) ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SmartCat Feeder Backend',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/feeds', feedsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/device', deviceRouter);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
