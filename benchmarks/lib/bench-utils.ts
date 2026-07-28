/**
 * Shared utilities for all CryptoTrade benchmarks.
 * Provides synthetic data generation, metrics computation, and reporting helpers.
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OHLCBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  signal: "buy" | "sell";
  pnl: number;
  pnlPct: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  avgTradeReturn: number;
  avgTradeReturnPct: number;
  numTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
}

export interface PredictionResult {
  timestamp: number;
  predictedSignal: string;
  actualSignal: string;
  confidence: number;
  correct: boolean;
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: Record<string, Record<string, number>>;
  totalPredictions: number;
}

export interface LatencyBreakdown {
  indicatorCalcMs: number;
  promptBuildMs: number;
  llmInferenceMs: number;
  jsonParsingMs: number;
  totalMs: number;
}

export interface BenchmarkReport {
  name: string;
  timestamp: string;
  category: string;
  summary: Record<string, string | number>;
  details: Record<string, unknown>;
}

// ─── Synthetic Market Data Generation ────────────────────────────────────────

/**
 * Generates realistic synthetic OHLC data using a geometric Brownian motion
 * model with configurable drift, volatility, and regime changes.
 */
export function generateOHLC(
  numCandles: number,
  options: {
    startPrice?: number;
    annualDrift?: number;
    annualVolatility?: number;
    seed?: number;
    regime?: "bull" | "bear" | "sideways" | "volatile" | "crash" | "mixed";
  } = {},
): OHLCBar[] {
  const {
    startPrice = 50000,
    annualDrift = 0.1,
    annualVolatility = 0.6,
    seed = 42,
    regime = "mixed",
  } = options;

  // Simple seeded PRNG
  let s = seed;
  const rand = (): number => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const randn = (): number => {
    const u1 = rand() || 0.0001;
    const u2 = rand() || 0.0001;
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };

  const dt = 1 / 365; // daily
  const bars: OHLCBar[] = [];
  let price = startPrice;
  const baseTime = Date.UTC(2024, 0, 1) / 1000;

  // Regime parameters
  const regimeParams: Record<
    string,
    { drift: number; vol: number; duration: number }
  > = {
    bull: { drift: 0.8, vol: 0.4, duration: numCandles },
    bear: { drift: -0.6, vol: 0.5, duration: numCandles },
    sideways: { drift: 0.02, vol: 0.15, duration: numCandles },
    volatile: { drift: 0.05, vol: 1.2, duration: numCandles },
    crash: { drift: -1.5, vol: 2.0, duration: Math.min(30, numCandles) },
    mixed: { drift: annualDrift, vol: annualVolatility, duration: 0 },
  };

  let regimeIdx = 0;
  const regimes: Array<{ drift: number; vol: number }> = [];

  if (regime === "mixed") {
    // Create a mix of regimes
    const mixPatterns = [
      { drift: 0.6, vol: 0.4, len: Math.floor(numCandles * 0.25) },
      { drift: -0.4, vol: 0.55, len: Math.floor(numCandles * 0.2) },
      { drift: 0.15, vol: 0.2, len: Math.floor(numCandles * 0.15) },
      { drift: 0.3, vol: 0.35, len: Math.floor(numCandles * 0.2) },
      { drift: -0.2, vol: 0.7, len: Math.floor(numCandles * 0.2) },
    ];
    for (const p of mixPatterns) {
      for (let i = 0; i < p.len; i++) {
        regimes.push({ drift: p.drift, vol: p.vol });
      }
    }
    // Fill remaining
    while (regimes.length < numCandles) {
      regimes.push({ drift: annualDrift, vol: annualVolatility });
    }
  } else if (regime === "crash") {
    // Crash then recovery
    const crashLen = Math.min(30, Math.floor(numCandles * 0.15));
    for (let i = 0; i < crashLen; i++) regimes.push({ drift: -1.5, vol: 2.0 });
    for (let i = crashLen; i < numCandles; i++)
      regimes.push({ drift: 0.3, vol: 0.5 });
  } else {
    const rp = regimeParams[regime];
    for (let i = 0; i < numCandles; i++) {
      regimes.push({ drift: rp.drift, vol: rp.vol });
    }
  }

  for (let i = 0; i < numCandles; i++) {
    const r = regimes[i];
    const drift = r.drift * dt;
    const diffusion = r.vol * Math.sqrt(dt) * randn();
    const logReturn = drift + diffusion;
    price = price * Math.exp(logReturn);

    const dailyVol = r.vol * Math.sqrt(dt);
    const open = price * (1 + (rand() - 0.5) * dailyVol * 0.5);
    const close = price;
    const high = Math.max(open, close) * (1 + rand() * dailyVol * 0.5);
    const low = Math.min(open, close) * (1 - rand() * dailyVol * 0.5);
    const volume = (500 + rand() * 2000) * (1 + Math.abs(logReturn) * 50);

    bars.push({
      timestamp: baseTime + i * 86400,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return bars;
}

/**
 * Converts OHLCBar[] to the OHLCData format used by the quant engine.
 */
export function toOHLCData(
  bars: OHLCBar[],
): [number, number, number, number, number, number?][] {
  return bars.map((b) => [
    b.timestamp,
    b.open,
    b.high,
    b.low,
    b.close,
    b.volume,
  ]);
}

/**
 * Creates a minimal CoinMarketData object for the quant engine.
 */
export function makeCoinData(
  id: string,
  symbol: string,
  name: string,
  price: number,
): {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
} {
  return {
    id,
    symbol,
    name,
    image: "",
    current_price: price,
    market_cap: price * 1_000_000,
    market_cap_rank: 1,
    fully_diluted_valuation: price * 1_200_000,
    total_volume: price * 100_000,
    high_24h: price * 1.02,
    low_24h: price * 0.98,
    price_change_24h: price * 0.01,
    price_change_percentage_24h: 1.0,
    market_cap_change_24h: 0,
    market_cap_change_percentage_24h: 0,
    circulating_supply: 1_000_000,
    total_supply: 1_000_000,
    max_supply: 1_200_000,
    ath: price * 2,
    ath_change_percentage: -50,
    ath_date: "2021-11-10",
    atl: price * 0.1,
    atl_change_percentage: 900,
    atl_date: "2020-03-13",
    last_updated: new Date().toISOString(),
  };
}

// ─── Metrics Computation ─────────────────────────────────────────────────────

export function computeBacktestMetrics(
  trades: Trade[],
  initialCapital: number,
): BacktestMetrics {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      totalReturnPct: 0,
      winRate: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      profitFactor: 0,
      avgTradeReturn: 0,
      avgTradeReturnPct: 0,
      numTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
    };
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate = winningTrades.length / trades.length;

  const totalProfit = winningTrades.reduce((s, t) => s + t.pnl, 0);
  const totalLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = totalLoss === 0 ? Infinity : totalProfit / totalLoss;

  const totalReturn = trades.reduce((s, t) => s + t.pnl, 0);
  const totalReturnPct = (totalReturn / initialCapital) * 100;

  const avgTradeReturn = totalReturn / trades.length;
  const avgTradeReturnPct =
    trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length;

  // Equity curve for drawdown
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;
  const returns: number[] = [];

  for (const trade of trades) {
    equity += trade.pnl;
    returns.push(trade.pnlPct / 100);
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const maxDrawdownPct = (maxDrawdown / initialCapital) * 100;

  // Sharpe ratio (annualized, assuming daily trades)
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev === 0 ? 0 : (meanReturn / stdDev) * Math.sqrt(252);

  // Sortino ratio
  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((s, r) => s + r ** 2, 0) / returns.length
      : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio =
    downsideDev === 0 ? 0 : (meanReturn / downsideDev) * Math.sqrt(252);

  return {
    totalReturn,
    totalReturnPct,
    winRate,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPct,
    profitFactor,
    avgTradeReturn,
    avgTradeReturnPct,
    numTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalProfit,
    totalLoss,
  };
}

export function computeClassificationMetrics(
  predictions: PredictionResult[],
): ClassificationMetrics {
  const signals = ["strong_buy", "buy", "hold", "sell", "strong_sell"];
  const matrix: Record<string, Record<string, number>> = {};

  for (const s of signals) {
    matrix[s] = {};
    for (const s2 of signals) {
      matrix[s][s2] = 0;
    }
  }

  let correct = 0;
  for (const p of predictions) {
    const pred = signals.includes(p.predictedSignal)
      ? p.predictedSignal
      : "hold";
    const actual = signals.includes(p.actualSignal) ? p.actualSignal : "hold";
    matrix[pred][actual]++;
    if (pred === actual) correct++;
  }

  const accuracy = predictions.length > 0 ? correct / predictions.length : 0;

  // Weighted precision/recall/F1 (macro average across classes)
  let precisionSum = 0;
  let recallSum = 0;
  let f1Sum = 0;
  let activeClasses = 0;

  for (const s of signals) {
    let tp = matrix[s][s];
    let fp = 0;
    let fn = 0;
    for (const s2 of signals) {
      if (s2 !== s) fp += matrix[s][s2];
      if (s2 !== s) fn += matrix[s2][s];
    }
    if (tp + fp + fn > 0) {
      const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
      const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1Val = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
      precisionSum += prec;
      recallSum += rec;
      f1Sum += f1Val;
      activeClasses++;
    }
  }

  return {
    accuracy,
    precision: activeClasses > 0 ? precisionSum / activeClasses : 0,
    recall: activeClasses > 0 ? recallSum / activeClasses : 0,
    f1: activeClasses > 0 ? f1Sum / activeClasses : 0,
    confusionMatrix: matrix,
    totalPredictions: predictions.length,
  };
}

// ─── Signal Mapping ──────────────────────────────────────────────────────────

/**
 * Maps a quant signal to a directional label for ground-truth comparison.
 * "strong_buy"/"buy" → "buy", "strong_sell"/"sell" → "sell", "hold" → "hold"
 */
export function signalToDirection(signal: string): "buy" | "sell" | "hold" {
  if (signal === "strong_buy" || signal === "buy") return "buy";
  if (signal === "strong_sell" || signal === "sell") return "sell";
  return "hold";
}

/**
 * Determines ground-truth signal from future price movement.
 */
export function groundTruthSignal(
  currentPrice: number,
  futurePrice: number,
  threshold = 0.01,
): "buy" | "sell" | "hold" {
  const change = (futurePrice - currentPrice) / currentPrice;
  if (change > threshold) return "buy";
  if (change < -threshold) return "sell";
  return "hold";
}

// ─── Reporting ───────────────────────────────────────────────────────────────

const RESULTS_DIR = path.resolve(import.meta.dirname, "..", "results");

export function saveReport(report: BenchmarkReport): string {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const filename = `${report.name.replace(/\s+/g, "-").toLowerCase()}-${report.timestamp.replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  return filepath;
}

export function printHeader(title: string): void {
  const line = "═".repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

export function printMetricsTable(
  metrics: Record<string, string | number>,
): void {
  const maxKeyLen = Math.max(...Object.keys(metrics).map((k) => k.length));
  for (const [key, value] of Object.entries(metrics)) {
    const paddedKey = key.padEnd(maxKeyLen + 2);
    const displayValue = typeof value === "number" ? value.toFixed(4) : value;
    console.log(`  ${paddedKey}${displayValue}`);
  }
  console.log();
}

export function printConfusionMatrix(
  matrix: Record<string, Record<string, number>>,
): void {
  const signals = Object.keys(matrix);
  console.log("\n  Confusion Matrix (rows=predicted, cols=actual):\n");
  const header = "           " + signals.map((s) => s.padStart(10)).join("");
  console.log(header);
  for (const pred of signals) {
    const row = signals
      .map((act) => String(matrix[pred][act]).padStart(10))
      .join("");
    console.log(`  ${pred.padEnd(9)}${row}`);
  }
  console.log();
}

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(1)} µs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
