# 🚀 Tier 1 — Production Engineering Upgrade Plan

> **Goal:** Transform CryptoTrade from a great side project into a production-grade
> application that demonstrates real-world engineering practices.

---

## Overview

| #   | Feature                               | Effort | Impact     | Status     |
| --- | ------------------------------------- | ------ | ---------- | ---------- |
| 1   | GitHub Actions CI/CD                  | Medium | ⭐⭐⭐⭐⭐ | ⬜ Pending |
| 2   | Docker + docker-compose               | Medium | ⭐⭐⭐⭐   | ⬜ Pending |
| 3   | Playwright E2E Tests                  | Medium | ⭐⭐⭐⭐⭐ | ⬜ Pending |
| 4   | Database + Prisma + Portfolio Tracker | Large  | ⭐⭐⭐⭐⭐ | ⬜ Pending |

---

## 1. GitHub Actions CI/CD

### What

A `.github/workflows/ci.yml` pipeline that runs on every push and PR to `main`.

### Jobs

```
┌─────────────────────────────────────────────────┐
│                    CI Pipeline                    │
│                                                   │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐ │
│  │  Lint    │   │  Test    │   │   Build       │ │
│  │          │   │          │   │               │ │
│  │ eslint   │   │ vitest   │   │ next build    │ │
│  │          │   │ (81 tests)│   │ (production)  │ │
│  └──────────┘   └──────────┘   └──────────────┘ │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │              Deploy (Vercel)                  │ │
│  │  Auto-deploys on push to main (already set)   │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Files to create

- `.github/workflows/ci.yml` — lint → test → build pipeline
- `.github/workflows/playwright.yml` — E2E tests on schedule + PR

### Resume bullet

> "Built CI/CD pipeline with GitHub Actions: automated linting, 81 unit tests,
> production build verification, and Vercel deployment on every push"

---

## 2. Docker + docker-compose

### What

Containerize the entire dev environment so anyone can run `docker compose up`
and get the full stack running.

### Architecture

```
┌──────────────────────────────────────────┐
│              docker-compose               │
│                                            │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Next.js  │  │  Ollama  │  │PostgreSQL│ │
│  │  (dev)    │  │  (Qwen3) │  │  (DB)   │ │
│  │  :3000    │  │  :11434  │  │  :5432  │ │
│  └──────────┘  └──────────┘  └─────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │           pgAdmin (optional)          │ │
│  │              :5050                    │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Files to create

- `Dockerfile` — multi-stage build for Next.js
- `docker-compose.yml` — orchestrates Next.js + Ollama + PostgreSQL
- `.dockerignore` — exclude node_modules, .next, etc.
- `docker-compose.prod.yml` — production override (optional)

### Resume bullet

> "Containerized full-stack application with Docker and docker-compose,
> enabling one-command local development with Next.js, Ollama LLM, and PostgreSQL"

---

## 3. Playwright E2E Tests

### What

Browser-level tests that verify real user flows actually work.

### Test scenarios (6-8 flows)

| #   | Test                 | What it verifies                      |
| --- | -------------------- | ------------------------------------- |
| 1   | Homepage loads       | Coin list renders, WebSocket connects |
| 2   | Coin detail page     | Chart renders, price data loads       |
| 3   | Trends page          | 50 coins ranked, AI summary card      |
| 4   | Search functionality | Type coin name, see results           |
| 5   | Currency converter   | Input amount, see conversion          |
| 6   | Mobile responsive    | Layout works at 375px width           |
| 7   | Error states         | Rate-limited UI, 404 coin page        |
| 8   | Dark mode / theme    | All pages render correctly            |

### Files to create

- `playwright.config.ts` — configuration
- `e2e/homepage.spec.ts`
- `e2e/coin-detail.spec.ts`
- `e2e/trends.spec.ts`
- `e2e/search.spec.ts`
- `e2e/mobile.spec.ts`

### Resume bullet

> "Implemented end-to-end testing with Playwright covering 8 critical user flows
> including real-time data, AI analysis, and responsive design"

---

## 4. Database + Prisma + Portfolio Tracker

### What

Add PostgreSQL with Prisma ORM to persist user data, then build a portfolio
tracker where users can add coins they hold and see their P&L.

### Schema Design

```prisma
model WatchlistItem {
  id        String   @id @default(cuid())
  coinId    String
  coinName  String
  addedAt   DateTime @default(now())
  createdAt DateTime @default(now())
}

model PortfolioHolding {
  id           String   @id @default(cuid())
  coinId       String
  coinName     String
  quantity     Float
  buyPriceUsd  Float
  buyDate      DateTime
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model PriceAlert {
  id           String   @id @default(cuid())
  coinId       String
  coinName     String
  targetPrice  Float
  direction    String   // "above" | "below"
  triggered    Boolean  @default(false)
  createdAt    DateTime @default(now())
}
```

### API Routes to create

| Route                 | Method          | Purpose                         |
| --------------------- | --------------- | ------------------------------- |
| `/api/portfolio`      | GET             | List all holdings with live P&L |
| `/api/portfolio`      | POST            | Add a holding                   |
| `/api/portfolio/[id]` | DELETE          | Remove a holding                |
| `/api/watchlist`      | GET/POST/DELETE | CRUD watchlist                  |
| `/api/alerts`         | GET/POST/DELETE | CRUD price alerts               |

### UI Pages to create

| Page         | Purpose                                       |
| ------------ | --------------------------------------------- |
| `/portfolio` | Holdings table with P&L, allocation pie chart |
| `/watchlist` | Saved coins with quick price view             |

### Files to create

- `prisma/schema.prisma`
- `lib/prisma.ts` — singleton client
- `app/api/portfolio/route.ts`
- `app/api/portfolio/[id]/route.ts`
- `app/api/watchlist/route.ts`
- `app/api/alerts/route.ts`
- `app/portfolio/page.tsx`
- `app/watchlist/page.tsx`
- `components/portfolio/HoldingsTable.tsx`
- `components/portfolio/AllocationChart.tsx`
- `components/portfolio/AddHoldingDialog.tsx`

### Resume bullet

> "Designed PostgreSQL schema with Prisma ORM and built a portfolio tracker
> with real-time P&L calculation, asset allocation visualization, and
> price alert system"

---

## Execution Order

```
Week 1:  Docker + docker-compose
         ↓
Week 2:  GitHub Actions CI/CD
         ↓
Week 3:  Playwright E2E Tests
         ↓
Week 4:  Database + Prisma + Portfolio Tracker
```

**Why this order:** Docker first so CI has a consistent environment. CI next so
tests run automatically. Playwright after CI so E2E tests run in the pipeline.
Database last because it's the biggest feature and builds on everything else.

---

## Final Resume Impact

After completing all 4 items, your resume can say:

> **CryptoTrade** — Full-stack cryptocurrency analytics platform
>
> - Built with **Next.js 16, React 19, TypeScript, Tailwind CSS v4**
> - **17 technical indicators** with composite scoring engine
> - **Local LLM integration** (Ollama + Qwen3 8B) for AI market analysis
> - **Real-time WebSocket** data streaming from CoinGecko
> - **CI/CD pipeline** with GitHub Actions: lint → test → build → deploy
> - **Docker containerized** with docker-compose for one-command setup
> - **81 unit tests** (Vitest) + **8 E2E flows** (Playwright)
> - **PostgreSQL + Prisma ORM** for portfolio tracking and price alerts
> - Deployed on **Vercel** with automatic preview deployments

---

## Next Step

Ready to start? Say **"start with Docker"** and I'll build it out step by step.
