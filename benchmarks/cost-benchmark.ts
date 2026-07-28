/**
 * #10 Cost Benchmark ⭐⭐⭐
 *
 * Compares estimated API costs across local (Ollama) vs cloud LLM providers.
 * Measures: cost per 1K requests, cost per 1M tokens, annual projection.
 *
 * Usage: npx tsx benchmarks/cost-benchmark.ts
 */

import { printHeader, saveReport } from "./lib/bench-utils.js";

interface ProviderCost {
  provider: string;
  model: string;
  inputPricePer1M: number; // USD per 1M input tokens
  outputPricePer1M: number; // USD per 1M output tokens
  avgInputTokens: number;
  avgOutputTokens: number;
  requestsPerDay: number;
}

const PROVIDERS: ProviderCost[] = [
  {
    provider: "Ollama (Local)",
    model: "qwen3:8b",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "OpenAI",
    model: "GPT-4o",
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "OpenAI",
    model: "GPT-4o-mini",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "Anthropic",
    model: "Claude 3.5 Sonnet",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "Anthropic",
    model: "Claude 3 Haiku",
    inputPricePer1M: 0.25,
    outputPricePer1M: 1.25,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "Google",
    model: "Gemini 1.5 Flash",
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.3,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
  {
    provider: "Together AI",
    model: "Llama 3.1 8B",
    inputPricePer1M: 0.18,
    outputPricePer1M: 0.18,
    avgInputTokens: 450,
    avgOutputTokens: 180,
    requestsPerDay: 1000,
  },
];

function computeCosts(p: ProviderCost) {
  const inputTokensPerDay = p.avgInputTokens * p.requestsPerDay;
  const outputTokensPerDay = p.avgOutputTokens * p.requestsPerDay;

  const dailyCost =
    (inputTokensPerDay / 1_000_000) * p.inputPricePer1M +
    (outputTokensPerDay / 1_000_000) * p.outputPricePer1M;

  const monthlyCost = dailyCost * 30;
  const annualCost = dailyCost * 365;
  const costPer1K = dailyCost / (p.requestsPerDay / 1000);

  return { dailyCost, monthlyCost, annualCost, costPer1K };
}

function main() {
  printHeader("CRYPTOTRADE COST BENCHMARK");

  console.log("  Assumptions:");
  console.log("    Avg input tokens per request:  ~450");
  console.log("    Avg output tokens per request: ~180");
  console.log("    Requests per day:              1,000");
  console.log();

  printHeader("COST COMPARISON");

  const header = `  ${"Provider".padEnd(22)}${"Model".padEnd(18)}${"Per 1K Req".padStart(12)}${"Monthly".padStart(12)}${"Annual".padStart(12)}`;
  console.log(header);
  console.log("  " + "─".repeat(76));

  const results: Array<{
    provider: string;
    model: string;
    costPer1K: number;
    monthlyCost: number;
    annualCost: number;
    savingsVsGPT4o: number;
  }> = [];

  for (const p of PROVIDERS) {
    const c = computeCosts(p);
    const gpt4oCost = computeCosts(PROVIDERS[1]);
    const savingsVsGPT4o =
      gpt4oCost.annualCost > 0
        ? ((gpt4oCost.annualCost - c.annualCost) / gpt4oCost.annualCost) * 100
        : 0;

    results.push({
      provider: p.provider,
      model: p.model,
      costPer1K: c.costPer1K,
      monthlyCost: c.monthlyCost,
      annualCost: c.annualCost,
      savingsVsGPT4o,
    });

    console.log(
      `  ${p.provider.padEnd(22)}${p.model.padEnd(18)}` +
        `$${c.costPer1K.toFixed(4).padStart(10)}` +
        `$${c.monthlyCost.toFixed(2).padStart(11)}` +
        `$${c.annualCost.toFixed(2).padStart(11)}`,
    );
  }

  console.log();
  printHeader("SAVINGS VS GPT-4o");

  for (const r of results) {
    if (r.provider === "OpenAI" && r.model === "GPT-4o") continue;
    console.log(
      `  ${r.provider} ${r.model}: ${r.savingsVsGPT4o.toFixed(1)}% cheaper annually`,
    );
  }

  console.log();
  printHeader("RECOMMENDATION");

  const local = results[0];
  console.log(`  ✅ Local Ollama (qwen3:8b): $0.00/year — completely free`);
  console.log(
    `  💡 Best cloud value: Gemini 1.5 Flash at $${results[5].annualCost.toFixed(2)}/year`,
  );
  console.log(
    `  ⚠️ GPT-4o would cost $${results[1].annualCost.toFixed(2)}/year for same volume`,
  );
  console.log();

  const report = {
    name: "cost-benchmark",
    timestamp: new Date().toISOString(),
    category: "Cost Analysis",
    summary: {
      localAnnualCost: 0,
      cheapestCloudAnnual: results[5].annualCost,
      mostExpensiveAnnual: results[1].annualCost,
      localSavingsVsGPT4o: "100%",
    },
    details: { results },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main();
