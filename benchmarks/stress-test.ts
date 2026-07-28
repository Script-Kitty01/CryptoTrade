/**
 * #11 Stress Test ⭐⭐⭐⭐
 *
 * Replays the quant engine across different market regimes:
 * - Bull markets
 * - Bear markets
 * - Flash crashes
 * - Sideways markets
 * - High volatility
 * - Low volatility
 *
 * Usage: npx tsx benchmarks/stress-test.ts
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
import { computeQuantSnapshot } from "../lib/quant.js";

const CONFIG = {
  candles: 400,
  lookback: 60,
  forwardWindow: 5,
  initialCapital: 10000,
  positionSize: 0.95,
};

const REGIMES: Array<{
  name: string;
  regime: "bull" | "bear" | "sideways" | "volatile" | "crash";
  startPrice: number;
  description: string;
}> = [
  {
    name: "Bull Market",
    regime: "bull",
    startPrice: 30000,
    description: "Sustained uptrend",
  },
  {
    name: "Bear Market",
    regime: "bear",
    startPrice: 60000,
    description: "Sustained downtrend",
  },
  {
    name: "Flash Crash",
    regime: "crash",
    startPrice: 50000,
    description: "Sharp crash + recovery",
  },
  {
    name: "Sideways",
    regime: "sideways",
    startPrice: 45000,
    description: "Low volatility range",
  },
  {
    name: "High Volatility",
    regime: "volatile",
    startPrice: 45000,
    description: "Large price swings",
  },
  {
    name: "Low Volatility",
    regime: "sideways",
    startPrice: 45000,
    description: "Minimal movement",
  },
];

function runBacktestForRegime(bars: OHLCBar[]): { trades: Trade[] } {
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

async function main() {
  printHeader("CRYPTOTRADE STRESS TEST");

  const results: Array<{
    regime: string;
    description: string;
    metrics: BacktestMetrics;
    priceChangePct: number;
  }> = [];

  for (const regime of REGIMES) {
    console.log(`  Testing ${regime.name} (${regime.description})...`);

    const bars = generateOHLC(CONFIG.candles, {
      startPrice: regime.startPrice,
      regime: regime.regime,
      seed: regime.name.charCodeAt(0) * 10,
    });

    const priceChangePct =
      ((bars[bars.length - 1].close - bars[0].close) / bars[0].close) * 100;

    const { trades } = runBacktestForRegime(bars);
    const metrics = computeBacktestMetrics(trades, CONFIG.initialCapital);

    results.push({
      regime: regime.name,
      description: regime.description,
      metrics,
      priceChangePct,
    });

    console.log(
      `    Price Δ: ${priceChangePct.toFixed(1)}% | Trades: ${metrics.numTrades} | Return: ${metrics.totalReturnPct.toFixed(2)}% | Sharpe: ${metrics.sharpeRatio.toFixed(2)}`,
    );
  }

  printHeader("STRESS TEST RESULTS");

  const header = `  ${"Regime".padEnd(18)}${"Price Δ%".padStart(10)}${"Return%".padStart(12)}${"Sharpe".padStart(10)}${"WinRate".padStart(10)}${"MaxDD%".padStart(10)}${"Trades".padStart(8)}`;
  console.log(header);
  console.log("  " + "─".repeat(78));

  for (const r of results) {
    console.log(
      `  ${r.regime.padEnd(18)}${r.priceChangePct.toFixed(1).padStart(9)}%${r.metrics.totalReturnPct.toFixed(2).padStart(11)}%${r.metrics.sharpeRatio.toFixed(2).padStart(10)}${(r.metrics.winRate * 100).toFixed(1).padStart(9)}%${r.metrics.maxDrawdownPct.toFixed(2).padStart(9)}%${String(r.metrics.numTrades).padStart(8)}`,
    );
  }

  // Best/worst regime
  const best = results.reduce((a, b) =>
    a.metrics.sharpeRatio > b.metrics.sharpeRatio ? a : b,
  );
  const worst = results.reduce((a, b) =>
    a.metrics.sharpeRatio < b.metrics.sharpeRatio ? a : b,
  );

  console.log(
    `\n  🟢 Best regime: ${best.regime} (Sharpe: ${best.metrics.sharpeRatio.toFixed(2)})`,
  );
  console.log(
    `  🔴 Worst regime: ${worst.regime} (Sharpe: ${worst.metrics.sharpeRatio.toFixed(2)})`,
  );

  // Consistency score (std dev of Sharpe across regimes)
  const sharpes = results.map((r) => r.metrics.sharpeRatio);
  const meanSharpe = sharpes.reduce((a, b) => a + b, 0) / sharpes.length;
  const stdSharpe = Math.sqrt(
    sharpes.reduce((s, v) => s + (v - meanSharpe) ** 2, 0) / sharpes.length,
  );
  console.log(
    `  📊 Sharpe consistency (σ): ${stdSharpe.toFixed(2)} (lower = more consistent)\n`,
  );

  const report = {
    name: "stress-test",
    timestamp: new Date().toISOString(),
    category: "Stress Test",
    summary: {
      bestRegime: best.regime,
      worstRegime: worst.regime,
      sharpeStdDev: stdSharpe,
      regimesTested: results.length,
    },
    details: {
      results: results.map((r) => ({
        regime: r.regime,
        description: r.description,
        priceChangePct: r.priceChangePct,
        metrics: r.metrics,
      })),
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
