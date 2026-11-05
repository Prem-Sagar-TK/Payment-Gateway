# Idempotent Payment Gateway — Frontend Dashboard

Interactive developer dashboard and real-time concurrency simulator for the **Idempotent Payment Gateway**. Built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## ⚡ Core Features

- **Real-Time Payment Console**: Submit card payments with custom or auto-generated idempotency keys.
- **Race Condition & Concurrency Simulator**: Fire $N$ simultaneous requests with the identical idempotency key to visually demonstrate and prove that duplicate requests are prevented and only one charge executes.
- **Transaction Ledger**: Live table displaying transaction ID, status (`PENDING`, `SUCCEEDED`, `FAILED`, `REPLAYED`), latency, and raw response payloads.
- **Idempotency Cache Inspector**: Inspect cached responses stored in PostgreSQL.

---

## 🏗️ Structure

```text
frontend/src/
├── components/          # Reusable UI widgets (PaymentForm, TransactionTable, MetricsCard)
├── pages/               # Main view containers (Dashboard, Simulator, History)
├── services/            # Axios API client interacting with backend endpoints
├── types/               # TypeScript interfaces for payments and transactions
├── App.tsx              # Root application layout
├── main.tsx             # React DOM entry point
└── index.css            # Tailwind CSS styling
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Available at `http://localhost:5173`.

### 3. Build for Production
```bash
npm run build
```
Optimized static bundles will be written to `dist/`.

