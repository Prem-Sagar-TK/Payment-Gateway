import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Prevent multiple instances during hot-reload in development.
// In production, module caching already ensures a singleton.
export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    datasources: process.env['DATABASE_URL']
      ? {
          db: {
            url: process.env['DATABASE_URL'],
          },
        }
      : undefined,
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env['NODE_ENV'] === 'development') {
  // Log slow queries only — never log full query params (may contain PII)
  prisma.$on('query' as never, (e: { duration: number; query: string }) => {
    if (e.duration > 100) {
      logger.debug('Slow query detected', { duration: e.duration, query: e.query });
    }
  });
}

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error('Prisma error', { message: e.message });
});

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}
