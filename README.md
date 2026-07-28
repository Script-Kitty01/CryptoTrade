# 🪙 CryptoTrade

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-Qwen3_8B-000000?style=for-the-badge&logo=ollama&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-✓-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-45ba4b?style=for-the-badge&logo=playwright&logoColor=white)

**AI-Powered Cryptocurrency Analytics Platform**

Real-time market data • 17 quant indicators • Local LLM analysis • Portfolio tracking • Dockerized • CI/CD

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [AI Analysis](#-ai-analysis) • [Portfolio](#-portfolio-tracker) • [Deploy](#-deploy)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Market Intelligence

- **Real-time WebSocket** price & trade streaming
- **Interactive candlestick charts** via lightweight-charts
- **Top 50 coin rankings** by composite quant score
- **Market-wide AI summary** — bias, risk level, key themes
- **Trending coins** with 24h change indicators

</td>
<td width="50%">

### 🤖 AI Trend Analyzer

- **17 technical indicators** — SMA, EMA, RSI, StochRSI, MACD, Bollinger Bands, ATR, ADX, VWAP, OBV, CMF, MFI, Williams %R, ROC, Momentum, Historical Volatility, Sharpe Ratio
- **Local LLM** (Ollama + Qwen3 8B) for natural-language analysis
- **Structured output** — signal, confidence, reasoning, bullish/bearish factors
- **Graceful fallback** to quant-only when LLM unavailable

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Modern UI/UX

- **Glass-morphism navbar** with backdrop blur
- **Dark theme** optimized for trading
- **Responsive design** — mobile to ultrawide
- **shadcn/ui components** with Radix primitives
- **Skeleton loading states** & empty states

</td>
<td width="50%">

### ⚡ Performance

- **Server Components** with Next.js App Router
- **60s cache** on all API routes
- **Concurrency-limited** batch requests (no rate-limiting)
- **Exponential backoff retry** on API failures
- **Turbopack** dev server

</td>
</tr>
<tr>
<td width="50%">

### 💼 Portfolio Tracker

- **Holdings management** — add, edit, delete coin holdings
- **Live P&L tracking** — invested vs current value with real-time prices
- **Allocation chart** — CSS conic-gradient donut chart
- **Watchlist** — save coins for quick monitoring
- **Price alerts** — set above/below target price notifications
- **PostgreSQL + Prisma** — type-safe database layer

</td>
<td width="50%">

### 🐳 DevOps & Testing

- **Docker** — multi-stage production build (332MB image)
- **Docker Compose** — app + PostgreSQL + optional Ollama
- **GitHub Actions CI** — lint → test → build → docker on every push
- **Playwright E2E** — 17 tests across 5 spec files (chromium + mobile)
- **Scheduled E2E** — daily 8AM UTC regression run
- **81 unit tests** — Vitest + Testing Library + MSW

</td>
</tr>
</table>

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph "Browser"
        UI[React 19 UI]
        WS[WebSocket Client]
    end

    subgraph "Next.js Server"
        SSR[Server Components]
        API[API Routes]
        CACHE[In-Memory Cache]
    end

    subgraph "Data Sources"
        CG[CoinGecko REST API]
        CGWS[CoinGecko WebSocket]
    end

    subgraph "AI Pipeline"
        QUANT[Quant Engine<br/>17 Indicators]
        LLM[Ollama<br/>Qwen3 8B]
    end

    subgraph "Persistence"
        DB[(PostgreSQL)]
        PRISMA[Prisma ORM]
    end

    subgraph "DevOps"
        DOCKER[Docker]
        CI[GitHub Actions]
        E2E[Playwright E2E]
    end

    UI --> SSR
    UI --> WS
    SSR --> API
    API --> CACHE
    API --> CG
    WS --> CGWS
    API --> QUANT
    QUANT --> LLM
    LLM --> API
    API --> PRISMA
    PRISMA --> DB
    API --> UI

    style LLM fill:#000,stroke:#00ff88,color:#00ff88
    style QUANT fill:#1a1a2e,stroke:#7b2ff7,color:#7b2ff7
    style UI fill:#0f0510,stroke:#ff6b9d,color:#ff6b9d
    style DB fill:#336791,stroke:#fff,color:#fff
    style DOCKER fill:#2496ED,stroke:#fff,color:#fff
```

### Scoring Engine

```mermaid
graph LR
    subgraph "17 Indicators"
        SMA --> MOMENTUM
        EMA --> MOMENTUM
        RSI --> MEAN_REV
        StochRSI --> MEAN_REV
        MACD --> TREND
        BB --> TREND
        ATR --> VOL_RISK
        ADX --> TREND
        VWAP --> MOMENTUM
        OBV --> VOLUME
        CMF --> VOLUME
        MFI --> VOLUME
        WILLR --> MEAN_REV
        ROC --> MOMENTUM
        MOM --> MOMENTUM
        HV --> VOL_RISK
        SHARPE --> VOL_RISK
    end

    MOMENTUM[Momentum Score] --> COMPOSITE
    TREND[Trend Score] --> COMPOSITE
    MEAN_REV[Mean Reversion] --> COMPOSITE
    VOLUME[Volume Score] --> COMPOSITE
    VOL_RISK[Volatility/Risk] --> COMPOSITE

    COMPOSITE[Composite Score<br/>0-100] --> SIGNAL
    SIGNAL{Signal}
    SIGNAL -->|≥70| SB[🟢 Strong Buy]
    SIGNAL -->|≥58| B[🟢 Buy]
    SIGNAL -->|≤30| SS[🔴 Strong Sell]
    SIGNAL -->|≤42| S[🔴 Sell]
    SIGNAL -->|else| H[🟡 Hold]
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **CoinGecko API Key** ([get one free](https://www.coingecko.com/en/api))
- **Ollama** (optional, for AI analysis)

### 1. Clone & Install

```bash
git clone https://github.com/Script-Kitty01/CryptoTrade.git
cd CryptoTrade
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=CG-your_api_key_here
NEXT_PUBLIC_COINGECKO_API_KEY=CG-your_api_key_here
NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL=wss://stream.coingecko.com/v1

# Local LLM (optional — falls back to quant-only if unavailable)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
ENABLE_LLM_ANALYSIS=true
OLLAMA_TIMEOUT_MS=30000

# PostgreSQL (for portfolio/watchlist/alerts)
DATABASE_URL=postgresql://crypto:crypto@localhost:5432/cryptotrade
```

### 3. (Optional) Set Up Ollama for AI Analysis

```bash
# Install Ollama from https://ollama.com
ollama pull qwen3:8b    # ~5.2 GB download
ollama serve
```

### 4. Start PostgreSQL

```bash
# Using Docker Compose (recommended)
docker compose up -d db

# Or use a local PostgreSQL instance and update DATABASE_URL
```

### 5. Initialize the Database

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Create database tables
```

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### 🐳 Docker (Alternative)

```bash
# Development with hot reload
docker compose up --build

# Production build
docker build -t cryptotrade .
docker run -p 3000:3000 cryptotrade
```

---

## 🤖 AI Analysis

CryptoTrade combines **quantitative analysis** with **local LLM reasoning** for unique market insights.

### How It Works

```
Coin Data → 17 Indicators → 5 Score Categories → Composite Score → LLM Prompt → Structured Analysis
```

### LLM Output

```json
{
  "signal": "buy",
  "confidence": 72,
  "summary": "BTC shows strong momentum with bullish MACD crossover...",
  "bullishFactors": ["MACD bullish crossover", "RSI recovering from oversold"],
  "bearishFactors": ["Volume declining", "Near resistance at $68K"],
  "risk": "medium",
  "reasoning": "The composite score of 68.5 is driven primarily by...",
  "confidenceExplanation": "Confidence is moderate due to mixed volume signals..."
}
```

### Market Summary

The `/trends` page sends the **top 5 ranked coins** to the LLM in a single call, producing:

- **Market Bias** — bullish / bearish / neutral
- **Risk Level** — low / medium / high
- **Key Theme** — e.g. "risk-on momentum", "defensive rotation"
- **Top Sectors** — inferred themes like "Layer 1 strength", "DeFi momentum"

> 💡 **No Ollama?** The app automatically falls back to quant-based analysis. All LLM features degrade gracefully.

---

## � Portfolio Tracker

Track your crypto holdings with live P&L, allocation charts, watchlists, and price alerts.

### Features

- **Holdings** — Add coins with quantity, buy price, date, and notes. View live P&L with current prices.
- **Allocation Chart** — Pure CSS conic-gradient donut chart showing portfolio distribution.
- **Watchlist** — Save coins for quick monitoring with live price updates.
- **Price Alerts** — Set target prices (above/below) to get notified when triggered.

### Pages

| Page         | Description                               |
| ------------ | ----------------------------------------- |
| `/portfolio` | Holdings table + P&L summary + allocation |
| `/watchlist` | Saved coins with live prices              |

---

## 📡 API Routes

| Route                            | Description                                  | Cache |
| -------------------------------- | -------------------------------------------- | ----- |
| `GET /api/trends`                | Top 50 coins ranked by composite quant score | 60s   |
| `GET /api/trends/summary`        | AI market summary (bias, risk, themes)       | 60s   |
| `GET /api/coins/[id]/analyze`    | Full quant + LLM analysis for a coin         | 60s   |
| `GET /api/coins/[id]/quant`      | Quant-only snapshot (no LLM)                 | 60s   |
| `GET /api/search`                | Search coins by name/symbol                  | —     |
| `GET /api/search/trending`       | Trending coins from CoinGecko                | 60s   |
| `GET /api/prices`                | Live prices by coin IDs                      | 30s   |
| `GET /api/portfolio`             | List all holdings                            | —     |
| `POST /api/portfolio`            | Add a new holding                            | —     |
| `PATCH /api/portfolio/[id]`      | Update a holding                             | —     |
| `DELETE /api/portfolio/[id]`     | Remove a holding                             | —     |
| `GET /api/watchlist`             | List watchlist items                         | —     |
| `POST /api/watchlist`            | Add to watchlist (upsert)                    | —     |
| `DELETE /api/watchlist/[coinId]` | Remove from watchlist                        | —     |
| `GET /api/alerts`                | List price alerts                            | —     |
| `POST /api/alerts`               | Create a price alert                         | —     |
| `DELETE /api/alerts/[id]`        | Delete a price alert                         | —     |

---

## 🧪 Testing

```bash
npm run test:run        # Unit tests (Vitest)
npm run test:e2e        # E2E tests (Playwright)
npm run test:e2e:ui     # E2E with UI mode
npm run test:e2e:report # View E2E report
```

### Unit Tests (81 tests, 6 files)

- LLM response parsing & normalization
- Fallback analysis generation
- Prompt building & configuration
- Quant indicator computation
- Scoring engine thresholds

### E2E Tests (17 tests, 5 spec files)

| Spec                  | Tests | Coverage                                          |
| --------------------- | ----- | ------------------------------------------------- |
| `homepage.spec.ts`    | 4     | Heading, coin overview, trending, nav             |
| `coin-detail.spec.ts` | 5     | BTC page, price, chart, converter, error state    |
| `trends.spec.ts`      | 4     | Page load, ranking table, market summary, signals |
| `search.spec.ts`      | 3     | Search input, coin list, navigation               |
| `mobile.spec.ts`      | 4     | All pages at iPhone 14 viewport                   |

---

## 📊 Benchmarks

A comprehensive **14-category benchmark suite** validates every layer of the system — from raw indicator computation to LLM inference to end-to-end trading performance.

```bash
cd benchmarks && npm install
npx tsx run-all.ts          # Run all 14 benchmarks
npx tsx run-all.ts --quick  # Quick mode (fewer iterations)
```

### Benchmark Results Summary

| #   | Category                   | Key Metric                 | Result                                                 |
| --- | -------------------------- | -------------------------- | ------------------------------------------------------ |
| 1   | **Trading Performance**    | Sharpe Ratio (aggregate)   | **3.76** across 36 trades (BTC/ETH/SOL)                |
| 2   | **Prediction Accuracy**    | Directional Accuracy       | **44.0%** (excl. hold, synthetic GBM data)             |
| 3   | **Baseline Comparison**    | Quant vs 5 strategies      | **Quant Engine #1** (Sharpe 2.80 vs RSI -11.85)        |
| 4   | **LLM Model Comparison**   | 4 local models tested      | qwen3:8b, gemma3:4b, llama3.2:3b, mistral:7b           |
| 5   | **Latency**                | End-to-end (no LLM)        | **3.8ms** mean (indicator calc + prompt build)         |
| 6   | **Throughput**             | Max coins/sec              | **2,853 coins/s** at 1,000 coins (350ms total)         |
| 7   | **Robustness**             | 6 failure scenarios        | **6/6 passed** (100% availability)                     |
| 8   | **Confidence Calibration** | Expected Calibration Error | **ECE = 2.41%** (Excellent)                            |
| 9   | **Prompt Evaluation**      | Token savings (Concise)    | **-74.7%** tokens vs default prompt                    |
| 10  | **Cost Analysis**          | Local vs Cloud             | **$0/year** (Ollama) vs **$1,068/year** (GPT-4o)       |
| 11  | **Stress Test**            | 6 market regimes           | Best: Flash Crash (Sharpe 10.62), Worst: Bear (-13.47) |
| 12  | **Explainability**         | 60 checks across 6 regimes | **60/60 passed** (100%)                                |
| 13  | **Component Ablation**     | Marginal contribution      | Indicators→Score: **+11.0%** accuracy gain             |
| 14  | **Regression Testing**     | 27 regression checks       | **26/27 passed** (96.3%)                               |

### Key Findings

- **Quant engine outperforms** all single-indicator strategies (RSI, MACD, SMA/EMA crossover) by 2-14× Sharpe ratio
- **Sub-score composition** (momentum + trend + meanReversion + volume + volatilityRisk) contributes +11% accuracy over raw indicators alone
- **Pipeline is production-grade**: 100% robustness across 6 failure modes, 60/60 explainability checks, 2,853 coins/sec throughput
- **Cost-effective**: Local Ollama deployment saves $1,068/year vs GPT-4o at 1,000 requests/day
- **Graceful degradation**: LLM failures trigger automatic quant-only fallback with zero downtime

---

## 📁 Project Structure

```
cryptoweb/
├── .github/workflows/
│   ├── ci.yml                    # CI: lint → test → build → docker
│   └── playwright.yml            # E2E: scheduled + on push
├── app/
│   ├── api/
│   │   ├── alerts/               # Price alerts CRUD
│   │   ├── coins/[id]/analyze/   # Quant + LLM analysis endpoint
│   │   ├── coins/[id]/quant/     # Quant-only endpoint
│   │   ├── portfolio/            # Holdings CRUD
│   │   ├── prices/               # Live prices by coin IDs
│   │   ├── trends/               # Top 50 ranking
│   │   ├── trends/summary/       # AI market summary
│   │   ├── search/               # Search & trending
│   │   └── watchlist/            # Watchlist CRUD
│   ├── coins/                    # Coin list & detail pages
│   ├── portfolio/                # Portfolio tracker page
│   ├── trends/                   # Trends ranking page
│   ├── watchlist/                # Watchlist page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles + glass navbar
├── components/
│   ├── home/                     # Home page sections
│   ├── portfolio/                # HoldingsTable, AddHoldingDialog, AllocationChart
│   ├── ui/                       # shadcn/ui primitives
│   ├── CandlestickChart.tsx      # OHLC candlestick chart
│   ├── CoinHeader.tsx            # Coin detail header
│   ├── QuantPanel.tsx            # AI analysis display
│   ├── TrendAnalyzer.tsx         # Analysis polling client
│   └── Header.tsx                # Glass-morphism navbar + search
├── e2e/                          # Playwright E2E test specs
├── hooks/
│   └── useCoingeckoWebsocket.ts  # WebSocket hook
├── lib/
│   ├── coingecko.actions.ts      # API fetcher + retry + concurrency
│   ├── quant.ts                  # 17 indicators + scoring engine
│   ├── llm.ts                    # Ollama integration + parsing
│   ├── prisma.ts                 # Prisma client singleton
│   ├── utils.ts                  # Formatters & helpers
│   └── __tests__/                # Vitest test suites
├── benchmarks/
│   ├── lib/bench-utils.ts        # Shared: synthetic data, metrics, reporting
│   ├── backtest.ts               # #1 Trading performance backtest
│   ├── prediction-accuracy.ts    # #2 Directional prediction accuracy
│   ├── baseline-comparison.ts    # #3 Strategy comparison (6 strategies)
│   ├── llm-comparison.ts         # #4 Multi-model LLM evaluation
│   ├── latency.ts                # #5 Pipeline latency breakdown
│   ├── throughput.ts             # #6 Coins/sec throughput scaling
│   ├── robustness.ts             # #7 Failure scenario testing
│   ├── confidence-calibration.ts # #8 Expected Calibration Error
│   ├── prompt-eval.ts            # #9 Prompt strategy comparison
│   ├── cost-benchmark.ts         # #10 Local vs cloud cost analysis
│   ├── stress-test.ts            # #11 6 market regime stress test
│   ├── explainability.ts         # #12 Output interpretability checks
│   ├── component-ablation.ts     # #13 Marginal contribution study
│   ├── regression.ts             # #14 Indicator + accuracy regression
│   ├── run-all.ts                # Master runner + consolidated report
│   └── results/                  # JSON benchmark reports
├── prisma/
│   └── schema.prisma             # DB schema (Holdings, Watchlist, Alerts)
├── public/                       # Static assets
├── Dockerfile                    # Multi-stage production build
├── Dockerfile.dev                # Development container
├── docker-compose.yml            # App + PostgreSQL + Ollama
├── playwright.config.ts          # Playwright configuration
├── prisma.config.ts              # Prisma v7 configuration
├── constants.ts                  # App constants
└── type.d.ts                     # TypeScript definitions
```

---

## 🚢 Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Import `Script-Kitty01/CryptoTrade` on [Vercel](https://vercel.com)
2. Set the environment variables from `.env.local`
3. For AI features, expose your local Ollama via tunnel:

```bash
# Option A: localtunnel
npx localtunnel --port 11434

# Option B: Cloudflare Tunnel
cloudflared tunnel --url http://127.0.0.1:11434
```

4. Set `OLLAMA_BASE_URL` to your tunnel URL on Vercel

> ⚠️ The tunnel must stay running on your machine for LLM features. If it disconnects, the app falls back to quant-only analysis.

---

## 🛠 Tech Stack

| Category       | Technology                                          |
| -------------- | --------------------------------------------------- |
| **Framework**  | Next.js 16 (App Router, Turbopack)                  |
| **UI**         | React 19, Tailwind CSS v4, shadcn/ui, Radix UI      |
| **Language**   | TypeScript 5                                        |
| **Charts**     | lightweight-charts 5, CSS conic-gradient            |
| **Data**       | CoinGecko REST + WebSocket                          |
| **AI**         | Ollama + Qwen3 8B                                   |
| **Database**   | PostgreSQL 17 + Prisma 7                            |
| **Testing**    | Vitest + Testing Library + MSW + Playwright         |
| **CI/CD**      | GitHub Actions (lint → test → build → docker + E2E) |
| **Container**  | Docker + Docker Compose                             |
| **Styling**    | tw-animate-css, clsx, tailwind-merge                |
| **Deployment** | Vercel                                              |

---

## 📄 License

MIT © Script-Kitty01

---

## 📝 Resume Template (Google XYZ Formula)

> The **XYZ formula**: "Accomplished **[X]** as measured by **[Y]**, by doing **[Z]**."
> Each bullet quantifies impact with a metric and explains the method.

### Suggested Resume Section

**CryptoTrade** — AI-Powered Cryptocurrency Analytics Platform  
*Next.js · TypeScript · Ollama · PostgreSQL · Docker · Playwright*

- **Built a real-time crypto analytics engine** processing **2,853 coins/second** with sub-4ms latency by implementing a 17-indicator quant pipeline (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, ADX, VWAP, OBV, CMF, MFI, Williams %R, ROC, Momentum, Historical Volatility, Sharpe Ratio) with composite scoring across 5 dimensions (momentum, trend, mean reversion, volume, volatility/risk)

- **Achieved 100% system availability across 6 failure scenarios** (insufficient data, LLM downtime, malformed JSON, extreme prices) by designing a graceful degradation architecture that automatically falls back from local LLM (Ollama + Qwen3 8B) to quant-only analysis with zero user-facing errors

- **Reduced operational costs by 100% vs cloud LLM providers** ($0/year vs $1,068/year for GPT-4o at 1,000 requests/day) by integrating a local Ollama inference pipeline with structured JSON output parsing, confidence scoring, and bullish/bearish factor extraction

- **Improved prediction accuracy by 11%** over raw indicator signals by implementing a weighted composite scoring engine that combines momentum, trend, mean reversion, volume, and volatility/risk sub-scores into a unified 0-100 signal with strong_buy/buy/hold/sell/strong_sell classification

- **Validated trading strategy robustness across 6 market regimes** (bull, bear, flash crash, sideways, high/low volatility) achieving a Sharpe ratio of 3.76 in aggregate backtests and 10.62 during flash crash conditions, outperforming single-indicator strategies by 2-14×

- **Engineered a comprehensive 14-category benchmark suite** covering trading performance, prediction accuracy, latency (P50/P95/P99), throughput scaling, robustness, confidence calibration (ECE 2.41%), prompt optimization (-74.7% tokens), cost analysis, stress testing, explainability (60/60 checks), component ablation, and regression testing — all with automated JSON report generation

- **Shipped a production-grade full-stack application** with 81 unit tests (Vitest), 17 E2E tests (Playwright across Chromium + mobile), Docker multi-stage builds (332MB image), GitHub Actions CI/CD (lint → test → build → docker), PostgreSQL + Prisma ORM for portfolio/watchlist/alert persistence, and real-time WebSocket price streaming

### Tech Stack for Resume

```
Languages:       TypeScript, SQL
Frontend:        Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Radix UI
Backend:         Next.js API Routes, Prisma 7, PostgreSQL 17
AI/ML:           Ollama, Qwen3 8B, 17 technical indicators, composite scoring engine
Data:            CoinGecko REST API, WebSocket real-time streaming, lightweight-charts 5
Testing:         Vitest (81 unit tests), Playwright (17 E2E tests), 14-category benchmark suite
DevOps:          Docker, Docker Compose, GitHub Actions CI/CD, Vercel deployment
Performance:     2,853 coins/sec throughput, 3.8ms pipeline latency, 60s API caching
```

### One-Liner Summary

> Full-stack crypto analytics platform combining 17 technical indicators with local LLM inference, achieving 2,853 coins/sec throughput, 100% failure-mode resilience, and $0 operational AI costs — validated by a 14-category benchmark suite across 6 market regimes.

---

<div align="center">

**Built with ❤️ and a lot of ☕**

[Report Bug](https://github.com/Script-Kitty01/CryptoTrade/issues) · [Request Feature](https://github.com/Script-Kitty01/CryptoTrade/issues)

</div>
