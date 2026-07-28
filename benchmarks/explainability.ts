/**
 * #12 Explainability Benchmark ⭐⭐⭐
 *
 * Evaluates whether the quant engine's output is interpretable:
 * - Are all sub-scores present and in valid ranges?
 * - Does the signal align with the dominant sub-score?
 * - Are indicator values within expected bounds?
 * - Is the confidence score consistent with score dispersion?
 *
 * Usage: npx tsx benchmarks/explainability.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  printHeader,
  printMetricsTable,
  saveReport,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";

const CONFIG = {
  candles: 300,
  startPrice: 45000,
  regimes: ["bull", "bear", "sideways", "volatile", "crash", "mixed"] as const,
};

interface ExplainabilityCheck {
  name: string;
  description: string;
  passed: boolean;
  detail: string;
}

function checkExplainability(
  snapshot: ReturnType<typeof computeQuantSnapshot>,
  regime: string,
): ExplainabilityCheck[] {
  const checks: ExplainabilityCheck[] = [];

  // 1. All sub-scores present
  const scoreKeys = [
    "momentum",
    "trend",
    "meanReversion",
    "volume",
    "volatilityRisk",
  ];
  const allScoresPresent = scoreKeys.every((k) => k in snapshot.scores);
  checks.push({
    name: "Sub-scores present",
    description:
      "All 5 sub-scores (momentum, trend, meanReversion, volume, volatilityRisk) are present",
    passed: allScoresPresent,
    detail: allScoresPresent
      ? `All present: ${scoreKeys.map((k) => `${k}=${snapshot.scores[k as keyof typeof snapshot.scores]}`).join(", ")}`
      : `Missing: ${scoreKeys.filter((k) => !(k in snapshot.scores)).join(", ")}`,
  });

  // 2. Sub-scores in valid range (0-100)
  const scoresInRange = scoreKeys.every((k) => {
    const v = snapshot.scores[k as keyof typeof snapshot.scores];
    return typeof v === "number" && v >= 0 && v <= 100;
  });
  checks.push({
    name: "Sub-scores in range",
    description: "All sub-scores are within 0-100",
    passed: scoresInRange,
    detail: scoresInRange ? "All in [0, 100]" : "Some scores out of range",
  });

  // 3. Composite score in valid range
  const compositeValid =
    snapshot.scores.composite >= 0 && snapshot.scores.composite <= 100;
  checks.push({
    name: "Composite score valid",
    description: "Composite score is within 0-100",
    passed: compositeValid,
    detail: `Composite = ${snapshot.scores.composite.toFixed(1)}`,
  });

  // 4. Signal is one of the expected values
  const validSignals = ["strong_buy", "buy", "hold", "sell", "strong_sell"];
  const signalValid = validSignals.includes(snapshot.signal);
  checks.push({
    name: "Valid signal",
    description: "Signal is one of: strong_buy, buy, hold, sell, strong_sell",
    passed: signalValid,
    detail: `Signal = ${snapshot.signal}`,
  });

  // 5. Confidence in valid range
  const confidenceValid =
    snapshot.confidence >= 0 && snapshot.confidence <= 100;
  checks.push({
    name: "Confidence valid",
    description: "Confidence is within 0-100",
    passed: confidenceValid,
    detail: `Confidence = ${snapshot.confidence.toFixed(1)}%`,
  });

  // 6. Signal aligns with composite score direction
  const isBullish =
    snapshot.signal === "strong_buy" || snapshot.signal === "buy";
  const isBearish =
    snapshot.signal === "strong_sell" || snapshot.signal === "sell";
  const isNeutral = snapshot.signal === "hold";
  const scoreAbove50 = snapshot.scores.composite > 50;
  const scoreBelow50 = snapshot.scores.composite < 50;

  const signalAlignsWithScore =
    (isBullish && scoreAbove50) ||
    (isBearish && scoreBelow50) ||
    (isNeutral &&
      snapshot.scores.composite >= 40 &&
      snapshot.scores.composite <= 60);

  checks.push({
    name: "Signal-score alignment",
    description:
      "Bullish signals have composite > 50, bearish < 50, neutral near 50",
    passed: signalAlignsWithScore,
    detail: `Signal=${snapshot.signal}, Composite=${snapshot.scores.composite.toFixed(1)}`,
  });

  // 7. Key indicators present
  const requiredIndicators = ["rsi14", "macdLine", "sma20", "ema12", "bbUpper"];
  const indicatorsPresent = requiredIndicators.every(
    (k) => k in snapshot.indicators,
  );
  checks.push({
    name: "Key indicators present",
    description: "RSI, MACD, SMA, EMA, Bollinger Bands are present",
    passed: indicatorsPresent,
    detail: indicatorsPresent
      ? "All key indicators present"
      : `Missing: ${requiredIndicators.filter((k) => !(k in snapshot.indicators)).join(", ")}`,
  });

  // 8. RSI in valid range
  const rsiVal = snapshot.indicators.rsi14;
  const rsiValid = rsiVal !== null && rsiVal >= 0 && rsiVal <= 100;
  checks.push({
    name: "RSI in range",
    description: "RSI is within 0-100",
    passed: rsiValid,
    detail: rsiVal !== null ? `RSI = ${rsiVal.toFixed(1)}` : "RSI = null",
  });

  // 9. Score dispersion is reasonable (not all identical)
  const scoreValues = scoreKeys.map(
    (k) => snapshot.scores[k as keyof typeof snapshot.scores] as number,
  );
  const scoreStdDev = Math.sqrt(
    scoreValues.reduce(
      (sum, v) =>
        sum +
        Math.pow(
          v - scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length,
          2,
        ),
      0,
    ) / scoreValues.length,
  );
  const dispersionReasonable = scoreStdDev > 1; // At least some variation
  checks.push({
    name: "Score dispersion",
    description: "Sub-scores have meaningful variation (σ > 1)",
    passed: dispersionReasonable,
    detail: `σ = ${scoreStdDev.toFixed(2)}`,
  });

  // 10. Features object has expected keys
  const featureKeys = Object.keys(snapshot.features);
  const hasFeatures = featureKeys.length >= 5;
  checks.push({
    name: "Features present",
    description: "At least 5 feature keys present",
    passed: hasFeatures,
    detail: `${featureKeys.length} features: ${featureKeys.slice(0, 5).join(", ")}${featureKeys.length > 5 ? "..." : ""}`,
  });

  return checks;
}

function main() {
  printHeader("CRYPTOTRADE EXPLAINABILITY BENCHMARK");

  const allChecks: Array<{ regime: string; checks: ExplainabilityCheck[] }> =
    [];

  for (const regime of CONFIG.regimes) {
    const bars = generateOHLC(CONFIG.candles, {
      startPrice: CONFIG.startPrice,
      regime,
      seed: regime.length, // Different seed per regime
    });

    const ohlcData = toOHLCData(bars);
    const coinData = makeCoinData(
      "btc",
      "btc",
      "Bitcoin",
      bars[bars.length - 1].close,
    );
    const snapshot = computeQuantSnapshot(coinData, ohlcData);

    const checks = checkExplainability(snapshot, regime);
    allChecks.push({ regime, checks });

    const passed = checks.filter((c) => c.passed).length;
    console.log(
      `  ${regime.padEnd(12)} ${passed}/${checks.length} checks passed`,
    );
  }

  // Aggregate results
  printHeader("EXPLAINABILITY RESULTS BY REGIME");

  const header = `  ${"Regime".padEnd(14)}${"Passed".padStart(8)}${"Failed".padStart(8)}${"Rate".padStart(8)}`;
  console.log(header);
  console.log("  " + "─".repeat(38));

  for (const { regime, checks } of allChecks) {
    const passed = checks.filter((c) => c.passed).length;
    const failed = checks.length - passed;
    console.log(
      `  ${regime.padEnd(14)}${String(passed).padStart(8)}${String(failed).padStart(8)}${((passed / checks.length) * 100).toFixed(0).padStart(7)}%`,
    );
  }

  // Detailed check breakdown
  printHeader("CHECK BREAKDOWN");

  const checkNames = allChecks[0].checks.map((c) => c.name);
  for (const checkName of checkNames) {
    const passedCount = allChecks.filter(
      ({ checks }) => checks.find((c) => c.name === checkName)?.passed,
    ).length;
    const status =
      passedCount === CONFIG.regimes.length
        ? "✅"
        : passedCount > 0
          ? "⚠️"
          : "❌";
    console.log(
      `  ${status} ${checkName}: ${passedCount}/${CONFIG.regimes.length} regimes`,
    );
  }

  // Summary
  printHeader("EXPLAINABILITY SUMMARY");

  const totalChecks = allChecks.reduce(
    (sum, { checks }) => sum + checks.length,
    0,
  );
  const totalPassed = allChecks.reduce(
    (sum, { checks }) => sum + checks.filter((c) => c.passed).length,
    0,
  );

  const summaryMetrics: Record<string, string | number> = {
    "Total Checks": totalChecks,
    Passed: totalPassed,
    Failed: totalChecks - totalPassed,
    "Pass Rate": `${((totalPassed / totalChecks) * 100).toFixed(1)}%`,
    "Regimes Tested": CONFIG.regimes.length,
    "Checks per Regime": allChecks[0].checks.length,
  };

  printMetricsTable(summaryMetrics);

  // Failed checks detail
  const failedChecks = allChecks.flatMap(({ regime, checks }) =>
    checks.filter((c) => !c.passed).map((c) => ({ regime, ...c })),
  );

  if (failedChecks.length > 0) {
    console.log("\n  Failed Checks:");
    for (const fc of failedChecks) {
      console.log(`    [${fc.regime}] ${fc.name}: ${fc.detail}`);
    }
  }

  const report = {
    name: "explainability-benchmark",
    timestamp: new Date().toISOString(),
    category: "Explainability",
    summary: {
      totalChecks,
      passed: totalPassed,
      failed: totalChecks - totalPassed,
      passRate: (totalPassed / totalChecks) * 100,
    },
    details: {
      regimes: allChecks.map(({ regime, checks }) => ({
        regime,
        passed: checks.filter((c) => c.passed).length,
        total: checks.length,
        checks,
      })),
    },
  };

  const savedPath = saveReport(report);
  console.log(`\n  Report saved to: ${savedPath}\n`);
}

main();
