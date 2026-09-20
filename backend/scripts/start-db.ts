import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';

async function main() {
  const dataDir = path.resolve(__dirname, '../.pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('[PostgreSQL] Initializing embedded PostgreSQL on port 5432...');
  const PGClass = (EmbeddedPostgres as any).default || EmbeddedPostgres;
  const pg = new PGClass({
    databaseDir: dataDir,
    port: 5432,
    user: 'postgres',
    password: 'postgrespassword',
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  console.log('[PostgreSQL] Server started successfully on port 5432.');

  try {
    await pg.createDatabase('payment_gateway');
    console.log('[PostgreSQL] Database "payment_gateway" created/verified.');
  } catch (e: any) {
    console.log('[PostgreSQL] Database "payment_gateway" ready.');
  }

  try {
    await pg.createDatabase('payment_gateway_test');
    console.log('[PostgreSQL] Database "payment_gateway_test" created/verified.');
  } catch (e: any) {
    console.log('[PostgreSQL] Database "payment_gateway_test" ready.');
  }

  console.log('[PostgreSQL] PostgreSQL is ready to accept connections.');

  const shutdown = async () => {
    console.log('[PostgreSQL] Stopping PostgreSQL server...');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive indefinitely
  setInterval(() => {}, 1000 * 60 * 60);
}

main().catch((err) => {
  console.error('[PostgreSQL] Failed to start:', err);
  process.exit(1);
});
