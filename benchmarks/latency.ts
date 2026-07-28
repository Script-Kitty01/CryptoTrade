/**
 * #5 Latency Benchmarks ⭐⭐⭐⭐
 *
 * Measures every stage of the analysis pipeline:
 *   Market Data → Indicators → Composite Score → LLM → JSON Output
 *
 * Usage: npx tsx benchmarks/latency.ts
 */

import { performance } from "node:perf_hooks";
import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  printHeader,
  printMetricsTable,
  saveReport,
  formatMs,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";
import { buildPrompt, parseLLMResponse, getLLMConfig } from "../lib/llm.js";

const CONFIG = {
  iterations: 50,
  candles: 200,
  startPrice: 45000,
  warmupIterations: 5,
};

interface StageTiming {
  indicatorCalcMs: number;
  promptBuildMs: number;
  llmInferenceMs: number;
  jsonParsingMs: number;
  totalMs: number;
}

async function measurePipeline(): Promise<StageTiming> {
  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
    regime: "mixed",
    seed: Math.floor(Math.random() * 10000),
  });
  const ohlcData = toOHLCData(bars);
  const coinData = makeCoinData(
    "btc",
    "btc",
    "Bitcoin",
    bars[bars.length - 1].close,
  );

  // Stage 1: Indicator calculation
  const t0 = performance.now();
  const snapshot = computeQuantSnapshot(coinData, ohlcData);
  const t1 = performance.now();

  // Stage 2: Prompt creation
  const prompt = buildPrompt(snapshot);
  const t2 = performance.now();

  // Stage 3: LLM inference (if available)
  let llmMs = 0;
  let parseMs = 0;
  const config = getLLMConfig();

  if (config.enabled) {
    try {
      const t3 = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(`${config.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          prompt,
          stream: false,
          format: "json",
          options: { temperature: 0.3, num_predict: 256 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = (await response.json()) as { response?: string };
      const t4 = performance.now();
      llmMs = t4 - t3;

      // Stage 4: JSON parsing
      const t5 = performance.now();
      parseLLMResponse(data.response || "");
      const t6 = performance.now();
      parseMs = t6 - t5;
    } catch {
      llmMs = -1; // mark as failed
    }
  }

  const totalMs = performance.now() - t0;

  return {
    indicatorCalcMs: t1 - t0,
    promptBuildMs: t2 - t1,
    llmInferenceMs: llmMs,
    jsonParsingMs: parseMs,
    totalMs,
  };
}

function computeStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median,
    p95,
    p99,
  };
}

async function main() {
  printHeader("CRYPTOTRADE LATENCY BENCHMARKS");

  console.log(
    `  Running ${CONFIG.iterations} iterations (${CONFIG.warmupIterations} warmup)...\n`,
  );

  // Warmup
  for (let i = 0; i < CONFIG.warmupIterations; i++) {
    await measurePipeline();
  }

  const timings: StageTiming[] = [];
  for (let i = 0; i < CONFIG.iterations; i++) {
    const t = await measurePipeline();
    timings.push(t);
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${CONFIG.iterations}\r`);
    }
  }
  console.log();

  // Compute stats per stage
  const indicatorTimes = timings.map((t) => t.indicatorCalcMs);
  const promptTimes = timings.map((t) => t.promptBuildMs);
  const llmTimes = timings
    .filter((t) => t.llmInferenceMs > 0)
    .map((t) => t.llmInferenceMs);
  const parseTimes = timings
    .filter((t) => t.jsonParsingMs > 0)
    .map((t) => t.jsonParsingMs);
  const totalTimes = timings.map((t) => t.totalMs);

  const llmFailures = timings.filter((t) => t.llmInferenceMs === -1).length;

  printHeader("LATENCY BREAKDOWN");

  const stages: Array<{ name: string; values: number[] }> = [
    { name: "Indicator Calculation", values: indicatorTimes },
    { name: "Prompt Building", values: promptTimes },
    { name: "LLM Inference (Ollama)", values: llmTimes },
    { name: "JSON Parsing", values: parseTimes },
    { name: "Total End-to-End", values: totalTimes },
  ];

  const header = `  ${"Stage".padEnd(28)}${"Mean".padStart(10)}${"Median".padStart(10)}${"P95".padStart(10)}${"P99".padStart(10)}${"Min".padStart(10)}${"Max".padStart(10)}`;
  console.log(header);
  console.log("  " + "─".repeat(88));

  for (const stage of stages) {
    if (stage.values.length === 0) {
      console.log(`  ${stage.name.padEnd(28)}${"(no data)".padStart(60)}`);
      continue;
    }
    const stats = computeStats(stage.values);
    console.log(
      `  ${stage.name.padEnd(28)}${formatMs(stats.mean).padStart(10)}${formatMs(stats.median).padStart(10)}${formatMs(stats.p95).padStart(10)}${formatMs(stats.p99).padStart(10)}${formatMs(stats.min).padStart(10)}${formatMs(stats.max).padStart(10)}`,
    );
  }

  if (llmFailures > 0) {
    console.log(`\n  ⚠ LLM failures: ${llmFailures}/${CONFIG.iterations}`);
  }

  console.log();

  const report = {
    name: "latency-benchmarks",
    timestamp: new Date().toISOString(),
    category: "Latency",
    summary: {
      avgIndicatorMs: computeStats(indicatorTimes).mean,
      avgPromptMs: computeStats(promptTimes).mean,
      avgLLMMs: llmTimes.length > 0 ? computeStats(llmTimes).mean : "N/A",
      avgParsingMs:
        parseTimes.length > 0 ? computeStats(parseTimes).mean : "N/A",
      avgTotalMs: computeStats(totalTimes).mean,
      llmFailures,
    },
    details: {
      stages: stages.map((s) => ({
        name: s.name,
        stats: s.values.length > 0 ? computeStats(s.values) : null,
      })),
      config: CONFIG,
    },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
