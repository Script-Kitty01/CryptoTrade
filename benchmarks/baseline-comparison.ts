/**
 * #3 Baseline Comparison ⭐⭐⭐⭐⭐
 *
 * Compares the quant engine against simple strategies:
 * - Buy & Hold
 * - RSI-only
 * - MACD-only
 * - SMA crossover
 * - EMA crossover
 * - Quant engine (full)
 *
 * Usage: npx tsx benchmarks/baseline-comparison.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  computeBacktestMetrics,
  printHeader,
  saveReport,
  type OHLCBar,
  type Trade,
  type BacktestMetrics,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot, rsi, macd, sma, ema } from "../lib/quant.js";

const CONFIG = {
  candles: 500,
  startPrice: 45000,
  lookback: 60,
  forwardWindow: 5,
  initialCapital: 10000,
  positionSize: 0.95,
};

// ─── Strategy Implementations ────────────────────────────────────────────────

function runBuyAndHold(bars: OHLCBar[]): BacktestMetrics {
  const entry = bars[CONFIG.lookback].close;
  const exit = bars[bars.length - 1].close;
  const pnlPct = ((exit - entry) / entry) * 100;
  const pnl = CONFIG.initialCapital * (pnlPct / 100);
  return computeBacktestMetrics(
    [
      {
        entryTime: bars[CONFIG.lookback].timestamp,
        exitTime: bars[bars.length - 1].timestamp,
        entryPrice: entry,
        exitPrice: exit,
        signal: "buy",
        pnl,
        pnlPct,
      },
    ],
    CONFIG.initialCapital,
  );
}

function runRSIOnly(bars: OHLCBar[]): { trades: Trade[] } {
  const trades: Trade[] = [];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (let i = CONFIG.lookback; i < bars.length - CONFIG.forwardWindow; i++) {
    const closes = bars.slice(0, i + 1).map((b) => b.close);
    const rsiVal = rsi(closes, 14);
    if (rsiVal === null) continue;

    const currentPrice = bars[i].close;

    if (!position && rsiVal < 35) {
      const size = (capital * CONFIG.positionSize) / currentPrice;
      position = {
        entryPrice: currentPrice,
        entryTime: bars[i].timestamp,
        size,
      };
    }

    if (
      position &&
      (rsiVal > 65 || i >= bars.length - CONFIG.forwardWindow - 1)
    ) {
      const exitPrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const pnlPct =
        ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entryTime: position.entryTime,
        exitTime:
          bars[i + CONFIG.forwardWindow]?.timestamp ?? bars[i].timestamp,
        entryPrice: position.entryPrice,
        exitPrice,
        signal: "buy",
        pnl,
        pnlPct,
      });
      capital += pnl;
      position = null;
    }
  }
  return { trades };
}

function runMACDOnly(bars: OHLCBar[]): { trades: Trade[] } {
  const trades: Trade[] = [];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (let i = CONFIG.lookback; i < bars.length - CONFIG.forwardWindow; i++) {
    const closes = bars.slice(0, i + 1).map((b) => b.close);
    const macdResult = macd(closes, 12, 26, 9);
    if (macdResult.histogram === null) continue;

    const currentPrice = bars[i].close;

    if (!position && macdResult.histogram > 0) {
      const size = (capital * CONFIG.positionSize) / currentPrice;
      position = {
        entryPrice: currentPrice,
        entryTime: bars[i].timestamp,
        size,
      };
    }

    if (
      position &&
      (macdResult.histogram < 0 || i >= bars.length - CONFIG.forwardWindow - 1)
    ) {
      const exitPrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const pnlPct =
        ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entryTime: position.entryTime,
        exitTime:
          bars[i + CONFIG.forwardWindow]?.timestamp ?? bars[i].timestamp,
        entryPrice: position.entryPrice,
        exitPrice,
        signal: "buy",
        pnl,
        pnlPct,
      });
      capital += pnl;
      position = null;
    }
  }
  return { trades };
}

function runSMACrossover(bars: OHLCBar[]): { trades: Trade[] } {
  const trades: Trade[] = [];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (let i = CONFIG.lookback; i < bars.length - CONFIG.forwardWindow; i++) {
    const closes = bars.slice(0, i + 1).map((b) => b.close);
    const sma20 = sma(closes, 20);
    const sma50 = sma(closes, 50);
    if (sma20 === null || sma50 === null) continue;

    const currentPrice = bars[i].close;

    if (!position && sma20 > sma50) {
      const size = (capital * CONFIG.positionSize) / currentPrice;
      position = {
        entryPrice: currentPrice,
        entryTime: bars[i].timestamp,
        size,
      };
    }

    if (
      position &&
      (sma20 < sma50 || i >= bars.length - CONFIG.forwardWindow - 1)
    ) {
      const exitPrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const pnlPct =
        ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entryTime: position.entryTime,
        exitTime:
          bars[i + CONFIG.forwardWindow]?.timestamp ?? bars[i].timestamp,
        entryPrice: position.entryPrice,
        exitPrice,
        signal: "buy",
        pnl,
        pnlPct,
      });
      capital += pnl;
      position = null;
    }
  }
  return { trades };
}

function runEMACrossover(bars: OHLCBar[]): { trades: Trade[] } {
  const trades: Trade[] = [];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (let i = CONFIG.lookback; i < bars.length - CONFIG.forwardWindow; i++) {
    const closes = bars.slice(0, i + 1).map((b) => b.close);
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    if (ema12 === null || ema26 === null) continue;

    const currentPrice = bars[i].close;

    if (!position && ema12 > ema26) {
      const size = (capital * CONFIG.positionSize) / currentPrice;
      position = {
        entryPrice: currentPrice,
        entryTime: bars[i].timestamp,
        size,
      };
    }

    if (
      position &&
      (ema12 < ema26 || i >= bars.length - CONFIG.forwardWindow - 1)
    ) {
      const exitPrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const pnlPct =
        ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entryTime: position.entryTime,
        exitTime:
          bars[i + CONFIG.forwardWindow]?.timestamp ?? bars[i].timestamp,
        entryPrice: position.entryPrice,
        exitPrice,
        signal: "buy",
        pnl,
        pnlPct,
      });
      capital += pnl;
      position = null;
    }
  }
  return { trades };
}

function runQuantEngine(bars: OHLCBar[]): { trades: Trade[] } {
  const trades: Trade[] = [];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (let i = CONFIG.lookback; i < bars.length - CONFIG.forwardWindow; i++) {
    const windowBars = bars.slice(0, i + 1);
    const ohlcData = toOHLCData(windowBars);
    const currentPrice = bars[i].close;
    const coinData = makeCoinData("btc", "btc", "Bitcoin", currentPrice);

    let snapshot;
    try {
      snapshot = computeQuantSnapshot(coinData, ohlcData);
    } catch {
      continue;
    }

    if (
      !position &&
      (snapshot.signal === "strong_buy" || snapshot.signal === "buy")
    ) {
      const size = (capital * CONFIG.positionSize) / currentPrice;
      position = {
        entryPrice: currentPrice,
        entryTime: bars[i].timestamp,
        size,
      };
    }

    if (
      position &&
      (snapshot.signal === "strong_sell" ||
        snapshot.signal === "sell" ||
        i >= bars.length - CONFIG.forwardWindow - 1)
    ) {
      const exitPrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const pnl = (exitPrice - position.entryPrice) * position.size;
      const pnlPct =
        ((exitPrice - position.entryPrice) / position.entryPrice) * 100;
      trades.push({
        entryTime: position.entryTime,
        exitTime:
          bars[i + CONFIG.forwardWindow]?.timestamp ?? bars[i].timestamp,
        entryPrice: position.entryPrice,
        exitPrice,
        signal: "buy",
        pnl,
        pnlPct,
      });
      capital += pnl;
      position = null;
    }
  }
  return { trades };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  printHeader("CRYPTOTRADE BASELINE COMPARISON");

  console.log("  Generating synthetic BTC data...");
  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
    regime: "mixed",
    seed: 42,
  });

  const strategies: Array<{
    name: string;
    run: () => { trades: Trade[] } | BacktestMetrics;
  }> = [
    { name: "Buy & Hold", run: () => runBuyAndHold(bars) },
    { name: "RSI Only", run: () => runRSIOnly(bars) },
    { name: "MACD Only", run: () => runMACDOnly(bars) },
    { name: "SMA Crossover", run: () => runSMACrossover(bars) },
    { name: "EMA Crossover", run: () => runEMACrossover(bars) },
    { name: "Quant Engine", run: () => runQuantEngine(bars) },
  ];

  const results: Array<{ name: string; metrics: BacktestMetrics }> = [];

  for (const strat of strategies) {
    console.log(`  Running ${strat.name}...`);
    const result = strat.run();

    if ("trades" in result) {
      const metrics = computeBacktestMetrics(
        result.trades,
        CONFIG.initialCapital,
      );
      results.push({ name: strat.name, metrics });
    } else {
      results.push({ name: strat.name, metrics: result });
    }
  }

  // ─── Comparison Table ────────────────────────────────────────────────────

  printHeader("STRATEGY COMPARISON");

  const header = `  ${"Strategy".padEnd(18)}${"Sharpe".padStart(10)}${"Win Rate".padStart(10)}${"Return%".padStart(12)}${"MaxDD%".padStart(10)}${"Trades".padStart(8)}`;
  console.log(header);
  console.log("  " + "─".repeat(68));

  for (const { name, metrics } of results) {
    const sharpe = metrics.sharpeRatio.toFixed(2);
    const winRate = `${(metrics.winRate * 100).toFixed(1)}%`;
    const returnPct = `${metrics.totalReturnPct.toFixed(2)}%`;
    const maxDD = `${metrics.maxDrawdownPct.toFixed(2)}%`;
    const trades = String(metrics.numTrades);

    console.log(
      `  ${name.padEnd(18)}${sharpe.padStart(10)}${winRate.padStart(10)}${returnPct.padStart(12)}${maxDD.padStart(10)}${trades.padStart(8)}`,
    );
  }

  console.log();

  // Highlight winner
  const best = results.reduce((a, b) =>
    a.metrics.sharpeRatio > b.metrics.sharpeRatio ? a : b,
  );
  console.log(
    `  🏆 Best Strategy: ${best.name} (Sharpe: ${best.metrics.sharpeRatio.toFixed(2)})\n`,
  );

  const report = {
    name: "baseline-comparison",
    timestamp: new Date().toISOString(),
    category: "Baseline Comparison",
    summary: Object.fromEntries(
      results.map((r) => [
        r.name,
        {
          sharpe: r.metrics.sharpeRatio,
          winRate: r.metrics.winRate,
          returnPct: r.metrics.totalReturnPct,
          maxDrawdownPct: r.metrics.maxDrawdownPct,
          numTrades: r.metrics.numTrades,
        },
      ]),
    ),
    details: {
      results: results.map((r) => ({ name: r.name, metrics: r.metrics })),
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
