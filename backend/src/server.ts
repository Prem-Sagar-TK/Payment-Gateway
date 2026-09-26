import { createApp } from './app';
import { config } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/prisma';

async function main() {

  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Failed to connect to database', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Idempotent Payment Gateway started`, {
      port: config.PORT,
      environment: config.NODE_ENV,
      providerMode: config.MOCK_PROVIDER_MODE,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server and database connections closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    process.exit(1);
  });
}

main();
