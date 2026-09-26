process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public';
process.env['PORT'] = '3002';
process.env['CORS_ORIGIN'] = 'http://localhost:5173';
process.env['MOCK_PROVIDER_MODE'] = 'success';
process.env['MOCK_PROVIDER_LATENCY_MIN'] = '10';
process.env['MOCK_PROVIDER_LATENCY_MAX'] = '30';
process.env['MOCK_PROVIDER_FAILURE_RATE'] = '0.0';
process.env['RATE_LIMIT_WINDOW_MS'] = '60000';
process.env['RATE_LIMIT_MAX'] = '1000';
process.env['LOG_LEVEL'] = 'error';
