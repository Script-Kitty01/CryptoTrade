/**
 * #4 LLM Model Comparison ⭐⭐⭐⭐
 *
 * Benchmarks multiple local LLM models for crypto analysis:
 * - Qwen3, Gemma 3, Llama 3, Mistral
 * Measures: Accuracy, Avg Latency, Avg Tokens, Success Rate.
 *
 * Usage: npx tsx benchmarks/llm-comparison.ts
 *
 * NOTE: Requires Ollama running locally with models pre-pulled.
 * Models tested: qwen3:8b, gemma3:4b, llama3.2:3b, mistral:7b
 */

import { performance } from "node:perf_hooks";
import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  printHeader,
  saveReport,
  formatMs,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";
import { buildPrompt, parseLLMResponse, getLLMConfig } from "../lib/llm.js";

const MODELS = ["qwen3:8b", "gemma3:4b", "llama3.2:3b", "mistral:7b"];

const CONFIG = {
  iterationsPerModel: 10,
  candles: 200,
  startPrice: 45000,
  timeoutMs: 30000,
};

interface ModelResult {
  model: string;
  successRate: number;
  avgLatencyMs: number;
  avgTokens: number;
  avgConfidence: number;
  signalDistribution: Record<string, number>;
  errors: number;
}

async function testModel(
  model: string,
  snapshot: ReturnType<typeof computeQuantSnapshot>,
): Promise<{
  success: boolean;
  latencyMs: number;
  tokenCount: number;
  signal: string;
  confidence: number;
}> {
  const config = getLLMConfig();
  const prompt = buildPrompt(snapshot);

  const t0 = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        options: { temperature: 0.3, num_predict: 512 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        latencyMs: 0,
        tokenCount: 0,
        signal: "hold",
        confidence: 0,
      };
    }

    const data = (await response.json()) as {
      response?: string;
      eval_count?: number;
      prompt_eval_count?: number;
    };

    const latencyMs = performance.now() - t0;
    const tokenCount = (data.eval_count ?? 0) + (data.prompt_eval_count ?? 0);
    const parsed = parseLLMResponse(data.response || "");

    return {
      success: parsed !== null,
      latencyMs,
      tokenCount,
      signal: parsed?.signal ?? "hold",
      confidence: parsed?.confidence ?? 50,
    };
  } catch {
    return {
      success: false,
      latencyMs: 0,
      tokenCount: 0,
      signal: "hold",
      confidence: 0,
    };
  }
}

async function main() {
  printHeader("CRYPTOTRADE LLM MODEL COMPARISON");

  // Generate test data once
  const bars = generateOHLC(CONFIG.candles, {
    startPrice: CONFIG.startPrice,
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

  const results: ModelResult[] = [];

  for (const model of MODELS) {
    console.log(`  Testing ${model}...`);

    const latencies: number[] = [];
    const tokens: number[] = [];
    const signals: string[] = [];
    const confidences: number[] = [];
    let successes = 0;
    let errors = 0;

    for (let i = 0; i < CONFIG.iterationsPerModel; i++) {
      const result = await testModel(model, snapshot);

      if (result.success) {
        successes++;
        latencies.push(result.latencyMs);
        tokens.push(result.tokenCount);
        signals.push(result.signal);
        confidences.push(result.confidence);
      } else {
        errors++;
      }

      process.stdout.write(`    ${i + 1}/${CONFIG.iterationsPerModel}\r`);
    }

    const signalDist: Record<string, number> = {};
    for (const s of signals) {
      signalDist[s] = (signalDist[s] || 0) + 1;
    }

    results.push({
      model,
      successRate: successes / CONFIG.iterationsPerModel,
      avgLatencyMs:
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0,
      avgTokens:
        tokens.length > 0
          ? Math.round(tokens.reduce((a, b) => a + b, 0) / tokens.length)
          : 0,
      avgConfidence:
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0,
      signalDistribution: signalDist,
      errors,
    });

    console.log(
      `    Success: ${(results[results.length - 1].successRate * 100).toFixed(0)}% | Latency: ${formatMs(results[results.length - 1].avgLatencyMs)} | Tokens: ${results[results.length - 1].avgTokens}`,
    );
  }

  printHeader("LLM MODEL COMPARISON RESULTS");

  const header = `  ${"Model".padEnd(16)}${"Success%".padStart(10)}${"Latency".padStart(12)}${"Tokens".padStart(10)}${"Confidence".padStart(12)}${"Errors".padStart(8)}`;
  console.log(header);
  console.log("  " + "─".repeat(68));

  for (const r of results) {
    console.log(
      `  ${r.model.padEnd(16)}${(r.successRate * 100).toFixed(0).padStart(9)}%${formatMs(r.avgLatencyMs).padStart(12)}${String(r.avgTokens).padStart(10)}${r.avgConfidence.toFixed(1).padStart(11)}%${String(r.errors).padStart(8)}`,
    );
  }

  // Signal distribution
  console.log("\n  Signal Distribution:");
  for (const r of results) {
    const dist = Object.entries(r.signalDistribution)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    console.log(`    ${r.model.padEnd(16)}${dist}`);
  }

  console.log();

  const report = {
    name: "llm-model-comparison",
    timestamp: new Date().toISOString(),
    category: "LLM Comparison",
    summary: {
      modelsTested: MODELS.length,
      bestLatency: results.reduce((a, b) =>
        a.avgLatencyMs < b.avgLatencyMs ? a : b,
      ).model,
      bestSuccessRate: results.reduce((a, b) =>
        a.successRate > b.successRate ? a : b,
      ).model,
    },
    details: { results, config: CONFIG },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
