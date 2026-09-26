import { PrismaClient } from '@prisma/client';

async function globalTeardown() {
  console.log('\n🧹 Running global test teardown...');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env['TEST_DATABASE_URL'] ??
          'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public',
      },
    },
  });

  try {

    await prisma.idempotencyRecord.deleteMany();
    await prisma.payment.deleteMany();
    console.log('✅ Test database cleaned up');
  } finally {
    await prisma.$disconnect();
  }
}

export default globalTeardown;
