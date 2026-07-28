/**
 * #9 Prompt Evaluation Benchmark ⭐⭐⭐⭐
 *
 * Compares different prompt strategies for the LLM analysis.
 * Measures token count, estimated latency, and prompt structure.
 *
 * Usage: npx tsx benchmarks/prompt-eval.ts
 */

import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  printHeader,
  saveReport,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot, type QuantSnapshot } from "../lib/quant.js";
import { buildPrompt } from "../lib/llm.js";

// ─── Alternative Prompt Strategies ───────────────────────────────────────────

function buildPromptConcise(snapshot: QuantSnapshot): string {
  const i = snapshot.indicators;
  const s = snapshot.scores;

  return `You are a crypto analyst. Analyze using only the data below. Return JSON.

Coin: ${snapshot.name} (${snapshot.symbol}) | Price: $${snapshot.price.toFixed(2)}
Quant signal: ${snapshot.signal} (${snapshot.confidence}%)

RSI: ${i.rsi14?.toFixed(1) ?? "n/a"} | MACD hist: ${i.macdHistogram?.toFixed(4) ?? "n/a"}
SMA20 dist: ${snapshot.features.priceToSma20 ? (snapshot.features.priceToSma20 * 100).toFixed(1) + "%" : "n/a"}
ADX: ${i.adx14?.toFixed(1) ?? "n/a"} | Vol trend: ${i.volumeTrend}
Scores: M=${s.momentum.toFixed(0)} T=${s.trend.toFixed(0)} MR=${s.meanReversion.toFixed(0)} V=${s.volume.toFixed(0)} C=${s.composite.toFixed(0)}

Return JSON: {"signal":"buy|sell|hold","confidence":0-100,"summary":"...","bullishFactors":[],"bearishFactors":[],"risk":"low|medium|high","reasoning":"...","confidenceExplanation":"..."}`;
}

function buildPromptNarrative(snapshot: QuantSnapshot): string {
  const i = snapshot.indicators;
  const f = snapshot.features;
  const s = snapshot.scores;

  return `Imagine you are explaining the technical outlook for ${snapshot.name} (${snapshot.symbol}) to a fellow trader. Write a natural analysis, then conclude with a structured JSON recommendation.

The current price is $${snapshot.price.toFixed(2)}. Our quantitative engine, which analyzes 17 technical indicators, gives a ${snapshot.signal} signal with ${snapshot.confidence}% confidence.

Here's what the indicators are telling us:
- The RSI(14) is at ${i.rsi14?.toFixed(1) ?? "n/a"}, which suggests ${(i.rsi14 ?? 50) > 70 ? "overbought conditions" : (i.rsi14 ?? 50) < 30 ? "oversold conditions" : "neutral momentum"}.
- MACD histogram is ${i.macdHistogram?.toFixed(4) ?? "n/a"}, indicating ${(i.macdHistogram ?? 0) > 0 ? "bullish" : "bearish"} momentum.
- The price is ${f.priceToSma20 ? (f.priceToSma20 > 0 ? "above" : "below") : "near"} the 20-period SMA.
- ADX(14) at ${i.adx14?.toFixed(1) ?? "n/a"} suggests ${(i.adx14 ?? 0) > 25 ? "a strong" : "a weak"} trend.
- Volume is ${i.volumeTrend ?? "stable"}.

Composite scores (0-100): Momentum ${s.momentum.toFixed(0)}, Trend ${s.trend.toFixed(0)}, Mean Reversion ${s.meanReversion.toFixed(0)}, Volume ${s.volume.toFixed(0)}.

Based on this analysis, provide your recommendation as a JSON object with: signal, confidence, summary, bullishFactors, bearishFactors, risk, reasoning, confidenceExplanation.`;
}

function buildPromptStructured(snapshot: QuantSnapshot): string {
  const i = snapshot.indicators;
  const f = snapshot.features;
  const s = snapshot.scores;

  return `TECHNICAL ANALYSIS TASK
=======================
Asset: ${snapshot.name} (${snapshot.symbol})
Price: $${snapshot.price.toFixed(2)}
Quant Pre-Analysis: ${snapshot.signal} (confidence: ${snapshot.confidence}%)

INDICATOR DATA:
- RSI(14): ${i.rsi14?.toFixed(1) ?? "n/a"}
- StochRSI: K=${i.stochRsiK?.toFixed(1) ?? "n/a"} D=${i.stochRsiD?.toFixed(1) ?? "n/a"}
- MACD: Line=${i.macdLine?.toFixed(4) ?? "n/a"} Signal=${i.macdSignal?.toFixed(4) ?? "n/a"} Hist=${i.macdHistogram?.toFixed(4) ?? "n/a"}
- Bollinger: Upper=${i.bbUpper?.toFixed(2) ?? "n/a"} Lower=${i.bbLower?.toFixed(2) ?? "n/a"} Width=${i.bbWidth?.toFixed(1) ?? "n/a"}%
- ATR(14): ${i.atr14?.toFixed(4) ?? "n/a"}
- ADX(14): ${i.adx14?.toFixed(1) ?? "n/a"}
- VWAP: $${i.vwap?.toFixed(2) ?? "n/a"}
- CMF(20): ${i.cmf20?.toFixed(3) ?? "n/a"}
- MFI(14): ${i.mfi14?.toFixed(1) ?? "n/a"}
- Williams %R: ${i.williamsR14?.toFixed(1) ?? "n/a"}
- ROC(10): ${i.roc10?.toFixed(2) ?? "n/a"}%
- Volatility(20): ${i.volatility20?.toFixed(2) ?? "n/a"}%
- Sharpe(20): ${i.sharpe20?.toFixed(3) ?? "n/a"}
- Volume Trend: ${i.volumeTrend}

FEATURES:
- Price/SMA20: ${f.priceToSma20 ? (f.priceToSma20 * 100).toFixed(2) + "%" : "n/a"}
- Price/SMA50: ${f.priceToSma50 ? (f.priceToSma50 * 100).toFixed(2) + "%" : "n/a"}
- RSI Trend: ${f.rsiTrend}
- RSI Divergence: ${f.rsiDivergence}
- MACD Cross: ${f.macdCross}
- Volume Spike: ${f.volumeSpike}
- ATR Expansion: ${f.atrExpansion}

SCORES (0-100):
- Momentum: ${s.momentum.toFixed(1)}
- Trend: ${s.trend.toFixed(1)}
- Mean Reversion: ${s.meanReversion.toFixed(1)}
- Volume: ${s.volume.toFixed(1)}
- Volatility Risk: ${s.volatilityRisk.toFixed(1)}
- Composite: ${s.composite.toFixed(1)}

OUTPUT FORMAT (strict JSON only):
{"signal":"strong_buy|buy|hold|sell|strong_sell","confidence":0-100,"summary":"...","bullishFactors":["..."],"bearishFactors":["..."],"risk":"low|medium|high","reasoning":"...","confidenceExplanation":"..."}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  printHeader("CRYPTOTRADE PROMPT EVALUATION");

  const bars = generateOHLC(200, {
    startPrice: 45000,
    regime: "mixed",
    seed: 42,
  });
  const ohlcData = toOHLCData(bars);
  const coinData = makeCoinData(
    "btc",
    "btc",
    "Bitcoin",
    bars[bars.length - 1].close,
  );
  const snapshot = computeQuantSnapshot(coinData, ohlcData);

  const prompts: Array<{
    name: string;
    builder: (s: QuantSnapshot) => string;
  }> = [
    { name: "Original (Default)", builder: buildPrompt },
    { name: "Concise", builder: buildPromptConcise },
    { name: "Narrative", builder: buildPromptNarrative },
    { name: "Structured", builder: buildPromptStructured },
  ];

  const results: Array<{
    name: string;
    charCount: number;
    tokenEstimate: number;
    sections: number;
    estimatedCostPer1k: string;
  }> = [];

  for (const prompt of prompts) {
    const text = prompt.builder(snapshot);
    const charCount = text.length;
    // Rough token estimate: ~4 chars per token for English
    const tokenEstimate = Math.round(charCount / 4);

    // Count sections (double newlines)
    const sections = text
      .split("\n\n")
      .filter((s) => s.trim().length > 0).length;

    // Estimated cost (local = free, but compare as if using API)
    // GPT-4: ~$0.03/1K input tokens
    const estimatedCostPer1k = `$${((tokenEstimate / 1000) * 0.03).toFixed(4)}`;

    results.push({
      name: prompt.name,
      charCount,
      tokenEstimate,
      sections,
      estimatedCostPer1k,
    });
  }

  printHeader("PROMPT COMPARISON");

  const header = `  ${"Prompt".padEnd(22)}${"Chars".padStart(8)}${"Tokens".padStart(8)}${"Sections".padStart(10)}${"Cost/1k".padStart(12)}`;
  console.log(header);
  console.log("  " + "─".repeat(60));

  for (const r of results) {
    console.log(
      `  ${r.name.padEnd(22)}${String(r.charCount).padStart(8)}${String(r.tokenEstimate).padStart(8)}${String(r.sections).padStart(10)}${r.estimatedCostPer1k.padStart(12)}`,
    );
  }

  // Token savings vs original
  const original = results[0];
  console.log("\n  Token Savings vs Original:");
  for (let i = 1; i < results.length; i++) {
    const savings =
      ((original.tokenEstimate - results[i].tokenEstimate) /
        original.tokenEstimate) *
      100;
    console.log(
      `    ${results[i].name}: ${savings > 0 ? "-" : "+"}${Math.abs(savings).toFixed(1)}% tokens`,
    );
  }

  console.log();

  const report = {
    name: "prompt-evaluation",
    timestamp: new Date().toISOString(),
    category: "Prompt Evaluation",
    summary: {
      originalTokens: original.tokenEstimate,
      bestTokenEfficiency: results.reduce((a, b) =>
        a.tokenEstimate < b.tokenEstimate ? a : b,
      ).name,
    },
    details: { results },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
