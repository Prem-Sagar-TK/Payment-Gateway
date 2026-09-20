/**
 * Load/Stress Test Script
 *
 * Measures throughput and latency of the idempotency guarantee under concurrent load.
 * Run with: npm run load-test
 *
 * Prerequisites: Backend must be running on PORT 3001 (npm run dev)
 */

import http from 'http';

const BASE_URL = `http://localhost:${process.env['PORT'] ?? 3001}/api/v1`;

interface BenchmarkResult {
  scenario: string;
  totalRequests: number;
  successfulResponses: number;
  conflictResponses: number;
  errorResponses: number;
  uniquePaymentsCreated: number;
  duplicatesPrevented: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalDurationMs: number;
  throughputRps: number;
}

/**
 * Makes a single POST /charges request and returns latency + status.
 */
function makeRequest(
  idempotencyKey: string,
  payload: object,
): Promise<{ status: number; latencyMs: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const startMs = Date.now();

    const options: http.RequestOptions = {
      hostname: 'localhost',
      port: Number(process.env['PORT'] ?? 3001),
      path: '/api/v1/charges',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Idempotency-Key': idempotencyKey,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          latencyMs: Date.now() - startMs,
          body: JSON.parse(data) as Record<string, unknown>,
        });
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? 0;
}

async function runScenario(
  scenario: string,
  n: number,
  makeKey: (i: number) => string,
  payload: object,
): Promise<BenchmarkResult> {
  console.log(`\n🔥 Scenario: ${scenario} (${n} requests)`);

  const start = Date.now();

  const results = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      makeRequest(makeKey(i), payload).catch((err: unknown) => ({
        status: 0,
        latencyMs: 0,
        body: { error: String(err) },
      })),
    ),
  );

  const totalDurationMs = Date.now() - start;

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successfulResponses = results.filter((r) => r.status === 200);
  const conflictResponses = results.filter((r) => r.status === 409);
  const errorResponses = results.filter((r) => r.status !== 200 && r.status !== 409);

  // Count unique payment IDs from successful responses
  const paymentIds = new Set(
    successfulResponses
      .map((r) => (r.body as { data?: { id?: string } }).data?.id)
      .filter(Boolean),
  );

  const result: BenchmarkResult = {
    scenario,
    totalRequests: n,
    successfulResponses: successfulResponses.length,
    conflictResponses: conflictResponses.length,
    errorResponses: errorResponses.length,
    uniquePaymentsCreated: paymentIds.size,
    duplicatesPrevented: n - paymentIds.size,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    totalDurationMs,
    throughputRps: Math.round((n / totalDurationMs) * 1000),
  };

  // Print table
  console.log(`  Total requests:        ${result.totalRequests}`);
  console.log(`  Successful (200):      ${result.successfulResponses}`);
  console.log(`  Conflict (409):        ${result.conflictResponses}`);
  console.log(`  Error responses:       ${result.errorResponses}`);
  console.log(`  Unique payments in DB: ${result.uniquePaymentsCreated}`);
  console.log(`  Duplicates prevented:  ${result.duplicatesPrevented}`);
  console.log(`  Avg latency:           ${result.avgLatencyMs}ms`);
  console.log(`  p50 latency:           ${result.p50LatencyMs}ms`);
  console.log(`  p95 latency:           ${result.p95LatencyMs}ms`);
  console.log(`  p99 latency:           ${result.p99LatencyMs}ms`);
  console.log(`  Total duration:        ${result.totalDurationMs}ms`);
  console.log(`  Throughput:            ${result.throughputRps} req/s`);

  return result;
}

async function resetDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port: Number(process.env['PORT'] ?? 3001), path: '/api/v1/demo/reset', method: 'POST' },
      (res) => {
        res.resume();
        res.on('end', resolve);
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log(' IDEMPOTENT PAYMENT GATEWAY — LOAD TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);

  // Reset before starting
  await resetDb().catch(() => {
    console.warn('⚠️  Could not reset DB (server may not be running on demo mode)');
  });

  const basePayload = {
    amount: 4999,
    currency: 'INR',
    customerId: 'cus_loadtest',
    description: 'Load test payment',
  };

  // ── Scenario 1: 100 requests, same key → 1 payment ────────────────────────
  const s1 = await runScenario(
    '100 concurrent — same key (expect 1 unique payment)',
    100,
    () => 'load-test-same-key',
    basePayload,
  );

  console.log(s1.uniquePaymentsCreated === 1 ? '\n  ✅ PASS: 1 unique payment' : '\n  ❌ FAIL: Expected 1 payment');

  await resetDb().catch(() => {});

  // ── Scenario 2: 100 requests, unique keys → 100 payments ──────────────────
  const s2 = await runScenario(
    '100 concurrent — unique keys (expect 100 unique payments)',
    100,
    (i) => `load-test-unique-key-${i}`,
    basePayload,
  );

  console.log(s2.uniquePaymentsCreated === 100 ? '\n  ✅ PASS: 100 unique payments' : `\n  ❌ FAIL: Expected 100 payments, got ${s2.uniquePaymentsCreated}`);

  await resetDb().catch(() => {});

  // ── Scenario 3: 500 concurrent — same key ────────────────────────────────
  const s3 = await runScenario(
    '500 concurrent — same key (stress test)',
    500,
    () => 'load-test-stress-key',
    basePayload,
  );

  console.log(s3.uniquePaymentsCreated === 1 ? '\n  ✅ PASS: 1 unique payment under 500 concurrent requests' : `\n  ❌ FAIL: Got ${s3.uniquePaymentsCreated} payments (expected 1)`);

  console.log('\n' + '='.repeat(60));
  console.log(' LOAD TEST COMPLETE');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
