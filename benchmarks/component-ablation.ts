/**
 * #13 Component Ablation Study ⭐⭐⭐⭐⭐
 *
 * Turns off components one at a time to measure each one's contribution.
 * Tests: Indicators only, Indicators + Score, Score + LLM, Full Pipeline.
 *
 * Usage: npx tsx benchmarks/component-ablation.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  computeClassificationMetrics,
  groundTruthSignal,
  signalToDirection,
  printHeader,
  saveReport,
} from "./lib/bench-utils.js";
import {
  computeQuantSnapshot,
  rsi,
  macd,
  sma,
  type QuantSnapshot,
} from "../lib/quant.js";
import { fallbackLLMResult } from "../lib/llm.js";

const CONFIG = {
  candles: 500,
  startPrice: 45000,
  lookback: 60,
  forwardHorizon: 5,
  predictionInterval: 3,
};

interface AblationResult {
  config: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  totalPredictions: number;
}

function predictWithIndicatorsOnly(
  closes: number[],
  currentPrice: number,
): string {
  const rsiVal = rsi(closes, 14);
  const macdResult = macd(closes, 12, 26, 9);

  if (rsiVal !== null && macdResult?.histogram !== null) {
    if (rsiVal < 35 && macdResult.histogram > 0) return "buy";
    if (rsiVal > 65 && macdResult.histogram < 0) return "sell";
  }
  if (rsiVal !== null) {
    if (rsiVal < 30) return "buy";
    if (rsiVal > 70) return "sell";
  }
  return "hold";
}

function predictWithIndicatorsAndScore(snapshot: QuantSnapshot): string {
  const { composite } = snapshot.scores;
  if (composite >= 70) return "strong_buy";
  if (composite >= 58) return "buy";
  if (composite <= 30) return "strong_sell";
  if (composite <= 42) return "sell";
  return "hold";
}

function predictWithScoreAndLLM(snapshot: QuantSnapshot): string {
  const fallback = fallbackLLMResult(snapshot);
  return fallback.signal;
}

function predictFullPipeline(snapshot: QuantSnapshot): string {
  return snapshot.signal;
}

async function main() {
  printHeader("CRYPTOTRADE COMPONENT ABLATION STUDY");

  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
    regime: "mixed",
    seed: 42,
  });

  const ablations: Array<{
    name: string;
    predictor: (
      closes: number[],
      snapshot: QuantSnapshot,
      price: number,
    ) => string;
  }> = [
    {
      name: "Indicators Only (RSI+MACD)",
      predictor: (closes) => predictWithIndicatorsOnly(closes, 0),
    },
    {
      name: "Indicators + Score",
      predictor: (_, snapshot) => predictWithIndicatorsAndScore(snapshot),
    },
    {
      name: "Score + LLM Fallback",
      predictor: (_, snapshot) => predictWithScoreAndLLM(snapshot),
    },
    {
      name: "Full Pipeline (Quant)",
      predictor: (_, snapshot) => predictFullPipeline(snapshot),
    },
  ];

  const results: AblationResult[] = [];

  for (const ablation of ablations) {
    console.log(`  Testing: ${ablation.name}...`);

    const predictions: Array<{
      timestamp: number;
      predictedSignal: string;
      actualSignal: string;
      confidence: number;
      correct: boolean;
    }> = [];

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

      let snapshot: QuantSnapshot;
      try {
        snapshot = computeQuantSnapshot(coinData, ohlcData);
      } catch {
        continue;
      }

      const closes = windowBars.map((b) => b.close);
      const predictedSignal = ablation.predictor(
        closes,
        snapshot,
        currentPrice,
      );
      const predictedDir = signalToDirection(predictedSignal);
      const actualDir = groundTruthSignal(currentPrice, futurePrice, 0.015);

      predictions.push({
        timestamp: bars[i].timestamp,
        predictedSignal,
        actualSignal: actualDir,
        confidence: snapshot.confidence,
        correct: predictedDir === actualDir,
      });
    }

    const metrics = computeClassificationMetrics(predictions);
    results.push({
      config: ablation.name,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      totalPredictions: metrics.totalPredictions,
    });
  }

  printHeader("ABLATION RESULTS");

  const header = `  ${"Configuration".padEnd(32)}${"Accuracy".padStart(12)}${"Precision".padStart(12)}${"Recall".padStart(10)}${"F1".padStart(10)}`;
  console.log(header);
  console.log("  " + "─".repeat(76));

  for (const r of results) {
    console.log(
      `  ${r.config.padEnd(32)}${(r.accuracy * 100).toFixed(1).padStart(11)}%${(r.precision * 100).toFixed(1).padStart(11)}%${(r.recall * 100).toFixed(1).padStart(9)}%${(r.f1 * 100).toFixed(1).padStart(9)}%`,
    );
  }

  // Contribution analysis
  if (results.length >= 2) {
    console.log("\n  Marginal Contribution (Δ Accuracy):");
    for (let i = 1; i < results.length; i++) {
      const delta = (results[i].accuracy - results[i - 1].accuracy) * 100;
      console.log(
        `    + ${results[i].config.split(" (")[0]}: ${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
      );
    }
  }

  console.log();

  const report = {
    name: "component-ablation",
    timestamp: new Date().toISOString(),
    category: "Component Ablation",
    summary: {
      bestConfig: results.reduce((a, b) => (a.accuracy > b.accuracy ? a : b))
        .config,
      bestAccuracy: Math.max(...results.map((r) => r.accuracy)),
      totalImprovement:
        results.length >= 2
          ? results[results.length - 1].accuracy - results[0].accuracy
          : 0,
    },
    details: { results, config: CONFIG },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
