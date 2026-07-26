# CryptoTrade

A modern cryptocurrency tracking platform built with Next.js, featuring real-time price updates, interactive charts, and comprehensive market data.

## Features

- **Real-time Price Tracking** - Live cryptocurrency prices via WebSocket connections
- **Interactive Charts** - Candlestick charts with OHLC data using lightweight-charts
- **Market Overview** - Trending coins, top gainers/losers, and market categories
- **Coin Details** - Comprehensive information including market cap, volume, and exchange listings
- **Currency Converter** - Multi-currency conversion tool
- **Live Trading Data** - Real-time trade feed and price updates
- **Search Functionality** - Quick search across all cryptocurrencies
- **AI Trend Analyzer** - Hybrid quant + local LLM analysis with signal, confidence, and reasoning
- **Market Trends Page** - Ranked list of top coins by composite quant score
- **Responsive Design** - Optimized for desktop and mobile devices

## Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Reusable component library
- **Radix UI** - Accessible component primitives

### Data & Visualization

- **CoinGecko API** - Cryptocurrency market data
- **WebSocket** - Real-time price and trade updates
- **lightweight-charts** - High-performance candlestick charts

### AI & Quant Analysis

- **Ollama** - Local LLM inference (default model: Qwen3 8B)
- **Custom quant engine** - SMA, EMA, RSI, MACD, Bollinger Bands, ATR, ADX, VWAP, OBV, CMF, MFI, Williams %R, ROC, momentum, volatility, Sharpe
- **Structured JSON output** - Signal, confidence, summary, bullish/bearish factors, risk, reasoning

### Utilities

- **lucide-react** - Icon library
- **clsx & tailwind-merge** - Conditional styling
- **query-string** - URL query parameter handling

## Project Structure

```
cryptoweb/
├── app/                      # Next.js App Router
│   ├── coins/               # Coin listing and detail pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── home/               # Home page components
│   ├── ui/                 # shadcn/ui components
│   └── ...                 # Feature components
├── hooks/                   # Custom React hooks
│   └── useCoingeckoWebsocket.ts
├── lib/                     # Utility functions
│   ├── coingecko.actions.ts # API server actions
│   └── utils.ts            # Helper functions
├── public/                  # Static assets
├── constants.ts            # App constants
└── type.d.ts              # TypeScript definitions
```

## Getting Started

### Prerequisites

- Node.js 20+ installed
- CoinGecko API key (Pro API recommended for WebSocket features)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cryptotrade.git
cd cryptotrade
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory:

```env
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=your_api_key_here
NEXT_PUBLIC_COINGECKO_API_KEY=your_api_key_here
NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL=wss://stream.coingecko.com/v1

# Local LLM (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
ENABLE_LLM_ANALYSIS=true
OLLAMA_TIMEOUT_MS=30000
```

4. (Optional) Install and run Ollama for AI analysis:

```bash
ollama pull qwen3:8b
ollama serve
```

> If Ollama is not running, the app falls back to quant-only analysis automatically.

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test:run` - Run Vitest test suite

## Key Features Explained

### Real-time Data

The app uses WebSocket connections to stream live price updates, trades, and OHLC data. The custom `useCoingeckoWebsocket` hook manages subscriptions and reconnection logic.

### Server-Side Rendering

Next.js App Router with React Server Components for optimal performance. Data is fetched server-side with automatic revalidation every 60 seconds.

### Type Safety

Comprehensive TypeScript definitions ensure type safety across the entire application, reducing runtime errors and improving developer experience.

### Responsive Design

Mobile-first approach with Tailwind CSS, ensuring the app works seamlessly across all device sizes.

## API Integration

The app integrates with CoinGecko API endpoints:

- `/coins/markets` - Market data for all coins
- `/coins/{id}` - Detailed coin information
- `/coins/{id}/ohlc` - Historical OHLC data
- `/onchain/networks/{network}/tokens/{address}/pools` - DEX pool data
- WebSocket streams for real-time updates

## Environment Variables

| Variable                              | Description            | Required |
| ------------------------------------- | ---------------------- | -------- |
| `COINGECKO_BASE_URL`                  | CoinGecko API base URL | Yes      |
| `COINGECKO_API_KEY`                   | Server-side API key    | Yes      |
| `NEXT_PUBLIC_COINGECKO_API_KEY`       | Client-side API key    | Yes      |
| `NEXT_PUBLIC_COINGECKO_WEBSOCKET_URL` | WebSocket endpoint     | Yes      |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [CoinGecko](https://www.coingecko.com/) for providing cryptocurrency data
- [Next.js](https://nextjs.org/) for the amazing framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [TradingView](https://www.tradingview.com/) for chart inspiration
