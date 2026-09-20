import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { v1Router } from './routes/v1.router';
import { logger } from './config/logger';

export function createApp() {
  const app = express();

  // ── Security ─────────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Request-Id', 'Authorization'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(compression());

  // ── Request ID ───────────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── HTTP logging (skip in test environment) ──────────────────────────────────
  if (config.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.http(msg.trim()) },
      }),
    );
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  app.use(
    '/api',
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
      },
      // Disable rate limiting in tests
      skip: () => config.NODE_ENV === 'test',
    }),
  );

  // ── Routes ────────────────────────────────────────────────────────────────────
  app.use('/api/v1', v1Router);

  // ── 404 handler ───────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
    });
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
