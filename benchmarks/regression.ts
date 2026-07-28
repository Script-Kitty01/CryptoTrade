/**
 * #14 Regression Testing ⭐⭐⭐⭐
 *
 * Runs a fixed set of historical predictions and verifies:
 * - Accuracy doesn't drop below baseline
 * - Latency doesn't increase beyond threshold
 * - All indicator functions return valid values
 *
 * Usage: npx tsx benchmarks/regression.ts
 */

import { performance } from "node:perf_hooks";
import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  computeClassificationMetrics,
  groundTruthSignal,
  signalToDirection,
  printHeader,
  printMetricsTable,
  saveReport,
  formatMs,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";
import {
  sma,
  ema,
  rsi,
  stochRsi,
  macd,
  bollingerBands,
  atr,
  adx,
  vwap,
  obv,
  cmf,
  mfi,
  williamsR,
  roc,
  momentum,
  historicalVolatility,
  sharpe,
  volumeTrend,
} from "../lib/quant.js";

const CONFIG = {
  candles: 500,
  startPrice: 45000,
  lookback: 60,
  forwardHorizon: 5,
  predictionInterval: 3,
  // Baseline thresholds (set from initial run)
  // Note: Synthetic GBM data is random-walk; accuracy ~35-40% is expected.
  // Real market data typically yields 55-70% directional accuracy.
  minAccuracy: 0.3,
  maxAvgLatencyMs: 50,
};

interface RegressionResult {
  name: string;
  passed: boolean;
  value: string | number;
  threshold: string | number;
}

async function main() {
  printHeader("CRYPTOTRADE REGRESSION TEST");

  const results: RegressionResult[] = [];

  // ─── 1. Indicator Function Correctness ──────────────────────────────────

  printHeader("1. Indicator Function Correctness");

  const testValues = Array.from(
    { length: 100 },
    (_, i) => 100 + i * 0.5 + Math.sin(i * 0.3) * 5,
  );
  const testHighs = testValues.map((v) => v + 2);
  const testLows = testValues.map((v) => v - 2);
  const testVolumes = testValues.map((_, i) => 1000 + i * 10);

  const indicatorTests: Array<{
    name: string;
    fn: () => unknown;
    check: (v: unknown) => boolean;
  }> = [
    {
      name: "SMA",
      fn: () => sma(testValues, 20),
      check: (v) => typeof v === "number" && v > 0,
    },
    {
      name: "EMA",
      fn: () => ema(testValues, 20),
      check: (v) => typeof v === "number" && v > 0,
    },
    {
      name: "RSI",
      fn: () => rsi(testValues, 14),
      check: (v) =>
        typeof v === "number" && (v as number) >= 0 && (v as number) <= 100,
    },
    {
      name: "StochRSI",
      fn: () => stochRsi(testValues),
      check: (v) => v !== null && typeof (v as { k: number }).k === "number",
    },
    {
      name: "MACD",
      fn: () => macd(testValues),
      check: (v) =>
        v !== null &&
        typeof (v as { histogram: number }).histogram === "number",
    },
    {
      name: "Bollinger",
      fn: () => bollingerBands(testValues),
      check: (v) =>
        v !== null &&
        (v as { upper: number }).upper! > (v as { lower: number }).lower!,
    },
    {
      name: "ATR",
      fn: () => atr(testHighs, testLows, testValues),
      check: (v) => typeof v === "number" && v > 0,
    },
    {
      name: "ADX",
      fn: () => adx(testHighs, testLows, testValues),
      check: (v) => v !== null,
    },
    {
      name: "VWAP",
      fn: () => vwap(testHighs, testLows, testValues, testVolumes),
      check: (v) => typeof v === "number" && v > 0,
    },
    {
      name: "OBV",
      fn: () => obv(testValues, testVolumes),
      check: (v) => typeof v === "number",
    },
    {
      name: "CMF",
      fn: () => cmf(testHighs, testLows, testValues, testVolumes),
      check: (v) => v !== null,
    },
    {
      name: "MFI",
      fn: () => mfi(testHighs, testLows, testValues, testVolumes),
      check: (v) =>
        typeof v === "number" && (v as number) >= 0 && (v as number) <= 100,
    },
    {
      name: "Williams %R",
      fn: () => williamsR(testHighs, testLows, testValues),
      check: (v) => v !== null,
    },
    { name: "ROC", fn: () => roc(testValues), check: (v) => v !== null },
    {
      name: "Momentum",
      fn: () => momentum(testValues),
      check: (v) => typeof v === "number",
    },
    {
      name: "Volatility",
      fn: () => historicalVolatility(testValues),
      check: (v) => typeof v === "number" && v >= 0,
    },
    { name: "Sharpe", fn: () => sharpe(testValues), check: (v) => v !== null },
    {
      name: "Volume Trend",
      fn: () => volumeTrend(testVolumes),
      check: (v) => v !== null,
    },
  ];

  let indicatorPassed = 0;
  for (const test of indicatorTests) {
    try {
      const value = test.fn();
      const passed = test.check(value);
      if (passed) indicatorPassed++;
      results.push({
        name: `Indicator: ${test.name}`,
        passed,
        value: passed ? "✅" : "❌",
        threshold: "Valid output",
      });
      console.log(`  ${passed ? "✅" : "❌"} ${test.name}`);
    } catch (e) {
      results.push({
        name: `Indicator: ${test.name}`,
        passed: false,
        value: "Error",
        threshold: "Valid output",
      });
      console.log(`  ❌ ${test.name} — threw error: ${e}`);
    }
  }

  console.log(
    `  ${indicatorPassed}/${indicatorTests.length} indicator tests passed\n`,
  );

  // ─── 2. Prediction Accuracy Regression ──────────────────────────────────

  printHeader("2. Prediction Accuracy Regression");

  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
    regime: "mixed",
    seed: 42,
  });

  const predictions: Array<{
    timestamp: number;
    predictedSignal: string;
    actualSignal: string;
    confidence: number;
    correct: boolean;
  }> = [];

  const latencies: number[] = [];

  for (
    let i = CONFIG.lookback;
    i < bars.length - CONFIG.forwardHorizon;
    i += CONFIG.predictionInterval
  ) {
    const t0 = performance.now();
    const windowBars = bars.slice(0, i + 1);
    const ohlcData = toOHLCData(windowBars);
    const currentPrice = bars[i].close;
    const futurePrice = bars[i + CONFIG.forwardHorizon].close;
    const coinData = makeCoinData("btc", "btc", "Bitcoin", currentPrice);

    let snapshot;
    try {
      snapshot = computeQuantSnapshot(coinData, ohlcData);
    } catch {
      continue;
    }

    latencies.push(performance.now() - t0);

    const predictedDir = signalToDirection(snapshot.signal);
    const actualDir = groundTruthSignal(currentPrice, futurePrice, 0.015);

    predictions.push({
      timestamp: bars[i].timestamp,
      predictedSignal: snapshot.signal,
      actualSignal: actualDir,
      confidence: snapshot.confidence,
      correct: predictedDir === actualDir,
    });
  }

  const metrics = computeClassificationMetrics(predictions);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  const accuracyPassed = metrics.accuracy >= CONFIG.minAccuracy;
  const latencyPassed = avgLatency <= CONFIG.maxAvgLatencyMs;

  results.push({
    name: "Accuracy Regression",
    passed: accuracyPassed,
    value: `${(metrics.accuracy * 100).toFixed(1)}%`,
    threshold: `≥ ${(CONFIG.minAccuracy * 100).toFixed(0)}%`,
  });

  results.push({
    name: "Latency Regression",
    passed: latencyPassed,
    value: formatMs(avgLatency),
    threshold: `≤ ${formatMs(CONFIG.maxAvgLatencyMs)}`,
  });

  console.log(
    `  ${accuracyPassed ? "✅" : "❌"} Accuracy: ${(metrics.accuracy * 100).toFixed(1)}% (threshold: ≥${(CONFIG.minAccuracy * 100).toFixed(0)}%)`,
  );
  console.log(
    `  ${latencyPassed ? "✅" : "❌"} Latency: ${formatMs(avgLatency)} (threshold: ≤${formatMs(CONFIG.maxAvgLatencyMs)})`,
  );

  // ─── 3. Snapshot Integrity ──────────────────────────────────────────────

  printHeader("3. Snapshot Integrity");

  const snapshot = computeQuantSnapshot(
    makeCoinData("btc", "btc", "Bitcoin", bars[bars.length - 1].close),
    toOHLCData(bars),
  );

  const integrityChecks: Array<{ name: string; check: boolean }> = [
    { name: "Has signal", check: !!snapshot.signal },
    {
      name: "Has confidence",
      check: snapshot.confidence >= 0 && snapshot.confidence <= 100,
    },
    {
      name: "Has composite score",
      check: snapshot.scores.composite >= 0 && snapshot.scores.composite <= 100,
    },
    {
      name: "Has all sub-scores",
      check: Object.values(snapshot.scores).every((v) => typeof v === "number"),
    },
    {
      name: "Has indicators object",
      check: Object.keys(snapshot.indicators).length >= 20,
    },
    {
      name: "Has features object",
      check: Object.keys(snapshot.features).length >= 8,
    },
    { name: "Has raw data", check: snapshot.raw.closes.length > 0 },
  ];

  for (const check of integrityChecks) {
    results.push({
      name: `Integrity: ${check.name}`,
      passed: check.check,
      value: check.check ? "✅" : "❌",
      threshold: "Present",
    });
    console.log(`  ${check.check ? "✅" : "❌"} ${check.name}`);
  }

  // ─── Summary ────────────────────────────────────────────────────────────

  printHeader("REGRESSION TEST SUMMARY");

  const totalPassed = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  const displayMetrics: Record<string, string | number> = {
    "Tests Passed": `${totalPassed}/${totalTests}`,
    "Pass Rate": `${((totalPassed / totalTests) * 100).toFixed(1)}%`,
    "Indicator Tests": `${indicatorPassed}/${indicatorTests.length}`,
    Accuracy: `${(metrics.accuracy * 100).toFixed(1)}%`,
    "Avg Latency": formatMs(avgLatency),
    "Predictions Run": predictions.length,
  };

  printMetricsTable(displayMetrics);

  const report = {
    name: "regression-test",
    timestamp: new Date().toISOString(),
    category: "Regression Testing",
    summary: {
      testsPassed: totalPassed,
      totalTests,
      passRate: (totalPassed / totalTests) * 100,
      accuracy: metrics.accuracy,
      avgLatencyMs: avgLatency,
    },
    details: {
      results,
      accuracy: metrics,
      avgLatencyMs: avgLatency,
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
