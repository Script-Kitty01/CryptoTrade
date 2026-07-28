/**
 * #8 Confidence Calibration Benchmark ⭐⭐⭐⭐
 *
 * Checks if the model's confidence scores are well-calibrated.
 * A 95% confidence prediction should be correct ~95% of the time.
 *
 * Usage: npx tsx benchmarks/confidence-calibration.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  groundTruthSignal,
  signalToDirection,
  printHeader,
  saveReport,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";

const CONFIG = {
  candles: 500,
  startPrice: 45000,
  lookback: 60,
  forwardHorizon: 5,
  predictionInterval: 3,
};

interface CalibrationBucket {
  range: string;
  minConf: number;
  maxConf: number;
  count: number;
  correct: number;
  accuracy: number;
}

async function main() {
  printHeader("CRYPTOTRADE CONFIDENCE CALIBRATION");

  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
    regime: "mixed",
    seed: 42,
  });

  const predictions: Array<{ confidence: number; correct: boolean }> = [];

  for (
    let i = CONFIG.lookback;
    i < bars.length - CONFIG.forwardHorizon;
    i += CONFIG.predictionInterval
  ) {
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

    const predictedDir = signalToDirection(snapshot.signal);
    const actualDir = groundTruthSignal(currentPrice, futurePrice, 0.015);
    const correct = predictedDir === actualDir;

    predictions.push({
      confidence: snapshot.confidence,
      correct,
    });
  }

  // Bucket by confidence ranges
  const buckets: CalibrationBucket[] = [
    {
      range: "0-20%",
      minConf: 0,
      maxConf: 20,
      count: 0,
      correct: 0,
      accuracy: 0,
    },
    {
      range: "20-40%",
      minConf: 20,
      maxConf: 40,
      count: 0,
      correct: 0,
      accuracy: 0,
    },
    {
      range: "40-60%",
      minConf: 40,
      maxConf: 60,
      count: 0,
      correct: 0,
      accuracy: 0,
    },
    {
      range: "60-80%",
      minConf: 60,
      maxConf: 80,
      count: 0,
      correct: 0,
      accuracy: 0,
    },
    {
      range: "80-100%",
      minConf: 80,
      maxConf: 100,
      count: 0,
      correct: 0,
      accuracy: 0,
    },
  ];

  for (const p of predictions) {
    for (const bucket of buckets) {
      if (p.confidence >= bucket.minConf && p.confidence < bucket.maxConf) {
        bucket.count++;
        if (p.correct) bucket.correct++;
        break;
      }
    }
  }

  for (const bucket of buckets) {
    bucket.accuracy = bucket.count > 0 ? bucket.correct / bucket.count : 0;
  }

  // ─── Report ──────────────────────────────────────────────────────────────

  printHeader("CONFIDENCE CALIBRATION RESULTS");

  console.log(
    `  ${"Confidence".padEnd(16)}${"Count".padStart(8)}${"Correct".padStart(10)}${"Accuracy".padStart(12)}${"Expected".padStart(12)}${"Gap".padStart(10)}`,
  );
  console.log("  " + "─".repeat(68));

  for (const bucket of buckets) {
    const expectedMid = (bucket.minConf + bucket.maxConf) / 2 / 100;
    const gap = bucket.accuracy - expectedMid;
    const gapStr = (gap >= 0 ? "+" : "") + (gap * 100).toFixed(1) + "%";

    console.log(
      `  ${bucket.range.padEnd(16)}${String(bucket.count).padStart(8)}${String(bucket.correct).padStart(10)}${(bucket.accuracy * 100).toFixed(1).padStart(11)}%${(expectedMid * 100).toFixed(1).padStart(11)}%${gapStr.padStart(10)}`,
    );
  }

  // Calibration error (ECE - Expected Calibration Error)
  let ece = 0;
  for (const bucket of buckets) {
    if (bucket.count > 0) {
      const expectedMid = (bucket.minConf + bucket.maxConf) / 2 / 100;
      ece +=
        (bucket.count / predictions.length) *
        Math.abs(bucket.accuracy - expectedMid);
    }
  }

  console.log(
    `\n  Expected Calibration Error (ECE): ${(ece * 100).toFixed(2)}%`,
  );
  console.log(`  Total Predictions: ${predictions.length}`);

  const calibrationQuality =
    ece < 0.05
      ? "Excellent"
      : ece < 0.1
        ? "Good"
        : ece < 0.15
          ? "Fair"
          : "Poor";
  console.log(`  Calibration Quality: ${calibrationQuality}\n`);

  const report = {
    name: "confidence-calibration",
    timestamp: new Date().toISOString(),
    category: "Confidence Calibration",
    summary: {
      ece: ece,
      calibrationQuality,
      totalPredictions: predictions.length,
    },
    details: {
      buckets,
      ece,
      calibrationQuality,
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
