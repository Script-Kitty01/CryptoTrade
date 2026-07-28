/**
 * #1 Trading Performance Backtest ⭐⭐⭐⭐⭐
 *
 * Simulates trading using the quant engine's signals over historical data.
 * Measures: Total Return, Win Rate, Sharpe Ratio, Sortino Ratio,
 *           Max Drawdown, Profit Factor, Avg Trade Return, Number of Trades.
 *
 * Usage: npx tsx benchmarks/backtest.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  computeBacktestMetrics,
  printHeader,
  printMetricsTable,
  saveReport,
  type OHLCBar,
  type Trade,
  type BacktestMetrics,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot, type QuantSnapshot } from "../lib/quant.js";

// ─── Configuration ───────────────────────────────────────────────────────────

const CONFIG = {
  coins: [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", startPrice: 45000 },
    { id: "ethereum", symbol: "eth", name: "Ethereum", startPrice: 2800 },
    { id: "solana", symbol: "sol", name: "Solana", startPrice: 120 },
  ],
  candlesPerCoin: 600, // ~2 years of daily data
  lookbackWindow: 60, // candles needed for indicator calculation
  forwardWindow: 5, // candles to hold before re-evaluating
  initialCapital: 10000,
  positionSize: 0.95, // % of capital per trade
  signalThreshold: 0.02, // minimum composite score deviation from 50 to trade
};

// ─── Backtest Engine ─────────────────────────────────────────────────────────

function runBacktest(
  bars: OHLCBar[],
  coinId: string,
  symbol: string,
  name: string,
): { trades: Trade[]; equityCurve: number[] } {
  const trades: Trade[] = [];
  const equityCurve: number[] = [CONFIG.initialCapital];
  let capital = CONFIG.initialCapital;
  let position: { entryPrice: number; entryTime: number; size: number } | null =
    null;

  for (
    let i = CONFIG.lookbackWindow;
    i < bars.length - CONFIG.forwardWindow;
    i++
  ) {
    const windowBars = bars.slice(0, i + 1);
    const ohlcData = toOHLCData(windowBars);
    const currentPrice = bars[i].close;
    const coinData = makeCoinData(coinId, symbol, name, currentPrice);

    let snapshot: QuantSnapshot;
    try {
      snapshot = computeQuantSnapshot(coinData, ohlcData);
    } catch {
      continue;
    }

    const { signal, confidence, scores } = snapshot;

    // Entry logic
    if (!position) {
      const shouldEnter =
        (signal === "strong_buy" || signal === "buy") &&
        Math.abs(scores.composite - 50) > CONFIG.signalThreshold * 100;

      if (shouldEnter) {
        const size = (capital * CONFIG.positionSize) / currentPrice;
        position = {
          entryPrice: currentPrice,
          entryTime: bars[i].timestamp,
          size,
        };
      }
    }

    // Exit logic
    if (position) {
      const futurePrice = bars[i + CONFIG.forwardWindow]?.close ?? currentPrice;
      const shouldExit =
        signal === "strong_sell" ||
        signal === "sell" ||
        i >= bars.length - CONFIG.forwardWindow - 1;

      if (shouldExit) {
        const exitPrice = futurePrice;
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
        equityCurve.push(capital);
        position = null;
      }
    }
  }

  // Close any open position at end
  if (position) {
    const lastPrice = bars[bars.length - 1].close;
    const pnl = (lastPrice - position.entryPrice) * position.size;
    const pnlPct =
      ((lastPrice - position.entryPrice) / position.entryPrice) * 100;
    trades.push({
      entryTime: position.entryTime,
      exitTime: bars[bars.length - 1].timestamp,
      entryPrice: position.entryPrice,
      exitPrice: lastPrice,
      signal: "buy",
      pnl,
      pnlPct,
    });
    capital += pnl;
    equityCurve.push(capital);
  }

  return { trades, equityCurve };
}

// ─── Buy & Hold Baseline ─────────────────────────────────────────────────────

function buyAndHoldMetrics(bars: OHLCBar[]): BacktestMetrics {
  const entryPrice = bars[CONFIG.lookbackWindow].close;
  const exitPrice = bars[bars.length - 1].close;
  const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;
  const pnl = CONFIG.initialCapital * (pnlPct / 100);

  return {
    totalReturn: pnl,
    totalReturnPct: pnlPct,
    winRate: pnl > 0 ? 1 : 0,
    sharpeRatio: pnlPct / 100 / 0.4, // rough annualized
    sortinoRatio: pnlPct / 100 / 0.35,
    maxDrawdown: 0,
    maxDrawdownPct: 0,
    profitFactor: pnl > 0 ? Infinity : 0,
    avgTradeReturn: pnl,
    avgTradeReturnPct: pnlPct,
    numTrades: 1,
    winningTrades: pnl > 0 ? 1 : 0,
    losingTrades: pnl < 0 ? 1 : 0,
    totalProfit: pnl > 0 ? pnl : 0,
    totalLoss: pnl < 0 ? Math.abs(pnl) : 0,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  printHeader("CRYPTOTRADE BACKTEST — Trading Performance");

  const allTrades: Trade[] = [];
  const coinResults: Record<string, BacktestMetrics> = {};

  for (const coin of CONFIG.coins) {
    console.log(
      `  Generating data & backtesting ${coin.name} (${coin.symbol.toUpperCase()})...`,
    );

    const bars = generateOHLC(CONFIG.candlesPerCoin, {
      startPrice: coin.startPrice,
      regime: "mixed",
      seed: coin.id.charCodeAt(0) * 100,
    });

    const { trades } = runBacktest(bars, coin.id, coin.symbol, coin.name);
    const metrics = computeBacktestMetrics(trades, CONFIG.initialCapital);

    coinResults[coin.symbol] = metrics;
    allTrades.push(...trades);

    console.log(
      `    Trades: ${metrics.numTrades} | Return: ${metrics.totalReturnPct.toFixed(2)}% | Sharpe: ${metrics.sharpeRatio.toFixed(2)} | Win Rate: ${(metrics.winRate * 100).toFixed(1)}%\n`,
    );
  }

  // Aggregate metrics
  const aggregateMetrics = computeBacktestMetrics(
    allTrades,
    CONFIG.initialCapital,
  );

  // Buy & hold comparison
  const btcBars = generateOHLC(CONFIG.candlesPerCoin, {
    startPrice: CONFIG.coins[0].startPrice,
    regime: "mixed",
    seed: CONFIG.coins[0].id.charCodeAt(0) * 100,
  });
  const bhMetrics = buyAndHoldMetrics(btcBars);

  // ─── Report ──────────────────────────────────────────────────────────────

  printHeader("AGGREGATE BACKTEST RESULTS");

  const displayMetrics: Record<string, string | number> = {
    "Total Return ($)": `$${aggregateMetrics.totalReturn.toFixed(2)}`,
    "Total Return (%)": `${aggregateMetrics.totalReturnPct.toFixed(2)}%`,
    "Win Rate": `${(aggregateMetrics.winRate * 100).toFixed(1)}%`,
    "Sharpe Ratio": aggregateMetrics.sharpeRatio.toFixed(2),
    "Sortino Ratio": aggregateMetrics.sortinoRatio.toFixed(2),
    "Max Drawdown (%)": `${aggregateMetrics.maxDrawdownPct.toFixed(2)}%`,
    "Profit Factor":
      aggregateMetrics.profitFactor === Infinity
        ? "∞"
        : aggregateMetrics.profitFactor.toFixed(2),
    "Avg Trade Return ($)": `$${aggregateMetrics.avgTradeReturn.toFixed(2)}`,
    "Avg Trade Return (%)": `${aggregateMetrics.avgTradeReturnPct.toFixed(2)}%`,
    "Number of Trades": aggregateMetrics.numTrades,
    "Winning Trades": aggregateMetrics.winningTrades,
    "Losing Trades": aggregateMetrics.losingTrades,
    "Total Profit ($)": `$${aggregateMetrics.totalProfit.toFixed(2)}`,
    "Total Loss ($)": `$${aggregateMetrics.totalLoss.toFixed(2)}`,
  };

  printMetricsTable(displayMetrics);

  // Per-coin breakdown
  console.log("  Per-Coin Breakdown:");
  console.log("  " + "─".repeat(65));
  console.log(
    `  ${"Coin".padEnd(8)}${"Trades".padStart(8)}${"Return%".padStart(12)}${"Sharpe".padStart(10)}${"WinRate".padStart(10)}${"MaxDD%".padStart(10)}`,
  );
  for (const [sym, m] of Object.entries(coinResults)) {
    console.log(
      `  ${sym.toUpperCase().padEnd(8)}${String(m.numTrades).padStart(8)}${m.totalReturnPct.toFixed(2).padStart(11)}%${m.sharpeRatio.toFixed(2).padStart(10)}${(m.winRate * 100).toFixed(1).padStart(9)}%${m.maxDrawdownPct.toFixed(2).padStart(9)}%`,
    );
  }

  // Buy & Hold comparison
  console.log(
    `\n  Buy & Hold BTC: Return ${bhMetrics.totalReturnPct.toFixed(2)}%`,
  );

  // Save report
  const report = {
    name: "backtest-trading-performance",
    timestamp: new Date().toISOString(),
    category: "Trading Performance",
    summary: {
      totalReturnPct: aggregateMetrics.totalReturnPct,
      winRate: aggregateMetrics.winRate,
      sharpeRatio: aggregateMetrics.sharpeRatio,
      sortinoRatio: aggregateMetrics.sortinoRatio,
      maxDrawdownPct: aggregateMetrics.maxDrawdownPct,
      profitFactor: aggregateMetrics.profitFactor,
      avgTradeReturnPct: aggregateMetrics.avgTradeReturnPct,
      numTrades: aggregateMetrics.numTrades,
    },
    details: {
      aggregate: aggregateMetrics,
      perCoin: coinResults,
      buyAndHold: bhMetrics,
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`\n  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
