/**
 * #2 Prediction Accuracy Benchmark ⭐⭐⭐⭐⭐
 *
 * Evaluates how often the quant engine's directional prediction matches
 * actual future price movement. Computes accuracy, precision, recall, F1,
 * and a confusion matrix.
 *
 * Usage: npx tsx benchmarks/prediction-accuracy.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  computeClassificationMetrics,
  groundTruthSignal,
  signalToDirection,
  printHeader,
  printMetricsTable,
  printConfusionMatrix,
  saveReport,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";

const CONFIG = {
  coins: [
    { id: "bitcoin", symbol: "btc", name: "Bitcoin", startPrice: 45000 },
    { id: "ethereum", symbol: "eth", name: "Ethereum", startPrice: 2800 },
    { id: "solana", symbol: "sol", name: "Solana", startPrice: 120 },
  ],
  candlesPerCoin: 500,
  lookbackWindow: 60,
  forwardHorizon: 5, // candles ahead for ground truth
  predictionInterval: 3, // make a prediction every N candles
};

async function main() {
  printHeader("CRYPTOTRADE PREDICTION ACCURACY");

  const allPredictions: Array<{
    timestamp: number;
    predictedSignal: string;
    actualSignal: string;
    confidence: number;
    correct: boolean;
  }> = [];

  for (const coin of CONFIG.coins) {
    console.log(`  Evaluating ${coin.name} (${coin.symbol.toUpperCase()})...`);

    const bars = generateOHLC(CONFIG.candlesPerCoin, {
      startPrice: coin.startPrice,
      regime: "mixed",
      seed: coin.id.charCodeAt(0) * 50,
    });

    let correctCount = 0;
    let totalCount = 0;

    for (
      let i = CONFIG.lookbackWindow;
      i < bars.length - CONFIG.forwardHorizon;
      i += CONFIG.predictionInterval
    ) {
      const windowBars = bars.slice(0, i + 1);
      const ohlcData = toOHLCData(windowBars);
      const currentPrice = bars[i].close;
      const futurePrice = bars[i + CONFIG.forwardHorizon].close;
      const coinData = makeCoinData(
        coin.id,
        coin.symbol,
        coin.name,
        currentPrice,
      );

      let snapshot;
      try {
        snapshot = computeQuantSnapshot(coinData, ohlcData);
      } catch {
        continue;
      }

      const predictedDir = signalToDirection(snapshot.signal);
      const actualDir = groundTruthSignal(currentPrice, futurePrice, 0.015);

      const correct = predictedDir === actualDir;
      if (correct) correctCount++;
      totalCount++;

      allPredictions.push({
        timestamp: bars[i].timestamp,
        predictedSignal: snapshot.signal,
        actualSignal: actualDir,
        confidence: snapshot.confidence,
        correct,
      });
    }

    console.log(
      `    ${totalCount} predictions | Accuracy: ${((correctCount / totalCount) * 100).toFixed(1)}%`,
    );
  }

  const metrics = computeClassificationMetrics(allPredictions);

  printHeader("PREDICTION ACCURACY RESULTS");

  const displayMetrics: Record<string, string | number> = {
    "Total Predictions": metrics.totalPredictions,
    Accuracy: `${(metrics.accuracy * 100).toFixed(2)}%`,
    "Precision (macro)": `${(metrics.precision * 100).toFixed(2)}%`,
    "Recall (macro)": `${(metrics.recall * 100).toFixed(2)}%`,
    "F1 Score (macro)": `${(metrics.f1 * 100).toFixed(2)}%`,
  };

  printMetricsTable(displayMetrics);
  printConfusionMatrix(metrics.confusionMatrix);

  // Directional accuracy (buy/sell only, ignoring hold)
  const directionalPreds = allPredictions.filter(
    (p) => p.predictedSignal !== "hold" && p.actualSignal !== "hold",
  );
  if (directionalPreds.length > 0) {
    const dirCorrect = directionalPreds.filter((p) => p.correct).length;
    console.log(
      `  Directional Accuracy (excl. hold): ${((dirCorrect / directionalPreds.length) * 100).toFixed(2)}% (${directionalPreds.length} predictions)\n`,
    );
  }

  const report = {
    name: "prediction-accuracy",
    timestamp: new Date().toISOString(),
    category: "Prediction Accuracy",
    summary: {
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      totalPredictions: metrics.totalPredictions,
    },
    details: {
      metrics,
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
