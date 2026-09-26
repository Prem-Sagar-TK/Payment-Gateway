import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {

  var __prisma: PrismaClient | undefined;
}

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
