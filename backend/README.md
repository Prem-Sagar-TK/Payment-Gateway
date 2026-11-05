# Idempotent Payment Gateway — Backend API

Production-grade, distributed idempotent payment gateway backend engineered with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

Guarantees **Zero Duplicate Payments** under high-concurrency network retries, connection timeouts, and simultaneous duplicate requests using atomic database transactions and strict idempotency key tracking.

---

## 🏛️ Architecture & Modules

```text
backend/src/
├── controllers/          # Express route handlers (PaymentController, IdempotencyController)
├── services/             # Core business logic (PaymentService, IdempotencyService, LedgerService)
├── middleware/           # Idempotency validation, rate limiting, and error handling
├── routes/               # API route definitions (/api/v1/payments, /api/v1/idempotency)
├── validators/           # Request schema validation using Joi / Zod
├── types/                # TypeScript interfaces and enum definitions
├── config/               # Environment variable parsing and database connection pool
├── app.ts                # Express application setup, middleware configuration
└── server.ts             # HTTP server listener and graceful shutdown handling
```

---

## 🔑 Idempotency Mechanism

1. **Idempotency Key Extraction**: Reads the `Idempotency-Key` header from incoming requests.
2. **Atomic Record Insertion**: Queries PostgreSQL within an ACID transaction (`SERIALIZABLE` or `READ COMMITTED` with row-level locks).
3. **In-Flight Handling**: If a request with the same idempotency key is currently processing, subsequent duplicate calls receive an immediate `409 Conflict` or wait for the initial transaction to resolve.
4. **Cached Response Replay**: If the initial payment succeeded or failed permanently, the exact saved response is replayed with the header `X-Cache-Lookup: HIT`, preventing double charging.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/payment_gateway?schema=public"
NODE_ENV=development
```

### 3. Run Prisma Migrations
```bash
npx prisma migrate dev
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Run Tests
```bash
npm test
```

