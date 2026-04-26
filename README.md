# Data Incident Response System (SentinelX)

A production-grade system built on top of OpenMetadata for detecting, tracking, and resolving data incidents in real-time.

## Features
- **Metadata Ingestion**: Connects to OpenMetadata APIs to fetch tables, lineage, and test results.
- **Detection Engine**: Real-time rules-engine for DQ failures, stale data, and missing ownership.
- **Incident Management**: PagerDuty-style dashboard for managing incident life-cycles.
- **Root Cause Analysis (RCA)**: Interactive lineage graph visualization using React Flow.
- **Health Scoring**: Automated dataset health scoring (0-100).
- **Simulation Mode**: Built-in mock data layer for presentation/demo environments.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS, React Query, React Flow, Recharts.
- **Backend**: Node.js, Express, Socket.io, Node-cron, Prisma.
- **Database**: PostgreSQL (Prisma ORM).

## Quick Start (Demo Mode)

### 1. Database
Spin up the PostgreSQL instance:
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```
*Note: Ensure `SIMULATION_MODE=true` in `backend/.env` for the demo.*

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture
`OpenMetadata → Backend (Detection Engine) → PostgreSQL → React Dashboard`
