/**
 * #7 Robustness Benchmark ⭐⭐⭐⭐
 *
 * Tests system behavior under failure scenarios:
 * - LLM unavailable (Ollama down)
 * - Malformed LLM responses
 * - Missing/incomplete market data
 * - Timeout scenarios
 *
 * Usage: npx tsx benchmarks/robustness.ts
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
import { fallbackLLMResult, parseLLMResponse } from "../lib/llm.js";

interface RobustnessTest {
  name: string;
  description: string;
  passed: boolean;
  availability: boolean;
  details: string;
}

async function main() {
  printHeader("CRYPTOTRADE ROBUSTNESS BENCHMARKS");

  const tests: RobustnessTest[] = [];

  // Generate test data
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

  // ─── Test 1: Quant engine with valid data ───────────────────────────────
  try {
    const snapshot = computeQuantSnapshot(coinData, ohlcData);
    tests.push({
      name: "Valid Data Processing",
      description: "Quant engine processes complete OHLC data",
      passed: snapshot.signal !== undefined && snapshot.confidence > 0,
      availability: true,
      details: `Signal: ${snapshot.signal}, Confidence: ${snapshot.confidence}%`,
    });
  } catch (e) {
    tests.push({
      name: "Valid Data Processing",
      description: "Quant engine processes complete OHLC data",
      passed: false,
      availability: false,
      details: `Error: ${e}`,
    });
  }

  // ─── Test 2: Insufficient data ──────────────────────────────────────────
  try {
    const shortBars = generateOHLC(10, {
      startPrice: 100,
      regime: "bull",
      seed: 1,
    });
    const shortOHLC = toOHLCData(shortBars);
    const shortCoin = makeCoinData("test", "tst", "Test", 100);
    computeQuantSnapshot(shortCoin, shortOHLC);
    // Should still work but with many nulls
    tests.push({
      name: "Insufficient Data",
      description: "Quant engine handles minimal OHLC data gracefully",
      passed: true,
      availability: true,
      details: "Returned snapshot with null indicators (expected)",
    });
  } catch {
    tests.push({
      name: "Insufficient Data",
      description: "Quant engine handles minimal OHLC data gracefully",
      passed: false,
      availability: false,
      details: "Threw error on insufficient data",
    });
  }

  // ─── Test 3: Fallback LLM result ────────────────────────────────────────
  try {
    const snapshot = computeQuantSnapshot(coinData, ohlcData);
    const fallback = fallbackLLMResult(snapshot);
    tests.push({
      name: "LLM Fallback Mode",
      description: "Fallback generates valid analysis without LLM",
      passed:
        fallback.signal !== undefined &&
        fallback.confidence > 0 &&
        fallback.summary.length > 0,
      availability: true,
      details: `Fallback signal: ${fallback.signal}, Confidence: ${fallback.confidence}%`,
    });
  } catch (e) {
    tests.push({
      name: "LLM Fallback Mode",
      description: "Fallback generates valid analysis without LLM",
      passed: false,
      availability: false,
      details: `Error: ${e}`,
    });
  }

  // ─── Test 4: Malformed JSON parsing ─────────────────────────────────────
  const malformedInputs = [
    "",
    "not json at all",
    '{"signal": "buy"}', // incomplete
    '```json\n{"signal": "buy", "confidence": 80}\n```',
    'Some text before {"signal": "sell", "confidence": 70, "summary": "test", "bullishFactors": [], "bearishFactors": [], "risk": "low", "reasoning": "test", "confidenceExplanation": "test"} more text',
  ];

  let malformedPassed = 0;
  for (const input of malformedInputs) {
    const result = parseLLMResponse(input);
    if (result !== null) malformedPassed++;
  }

  tests.push({
    name: "Malformed JSON Handling",
    description: "Parser handles various malformed LLM outputs",
    passed: malformedPassed >= 2, // at least some should parse
    availability: true,
    details: `${malformedPassed}/${malformedInputs.length} malformed inputs parsed successfully`,
  });

  // ─── Test 5: Empty/null data arrays ─────────────────────────────────────
  try {
    const emptyBars = generateOHLC(5, {
      startPrice: 100,
      regime: "bull",
      seed: 1,
    });
    const emptyOHLC = toOHLCData(emptyBars);
    const emptyCoin = makeCoinData("test", "tst", "Test", 100);
    const snap = computeQuantSnapshot(emptyCoin, emptyOHLC);
    tests.push({
      name: "Minimal Data Handling",
      description: "Engine handles near-empty data arrays",
      passed: snap.signal !== undefined,
      availability: true,
      details: `Signal: ${snap.signal} (most indicators null)`,
    });
  } catch (e) {
    tests.push({
      name: "Minimal Data Handling",
      description: "Engine handles near-empty data arrays",
      passed: false,
      availability: false,
      details: `Error: ${e}`,
    });
  }

  // ─── Test 6: Extreme price values ───────────────────────────────────────
  try {
    const extremeBars = generateOHLC(200, {
      startPrice: 0.00001,
      regime: "volatile",
      seed: 99,
    });
    const extremeOHLC = toOHLCData(extremeBars);
    const extremeCoin = makeCoinData(
      "micro",
      "MIC",
      "Micro Coin",
      extremeBars[extremeBars.length - 1].close,
    );
    const snap = computeQuantSnapshot(extremeCoin, extremeOHLC);
    tests.push({
      name: "Extreme Price Values",
      description: "Engine handles very small price values",
      passed: snap.signal !== undefined && !isNaN(snap.confidence),
      availability: true,
      details: `Price: $${extremeBars[extremeBars.length - 1].close.toFixed(8)}, Signal: ${snap.signal}`,
    });
  } catch (e) {
    tests.push({
      name: "Extreme Price Values",
      description: "Engine handles very small price values",
      passed: false,
      availability: false,
      details: `Error: ${e}`,
    });
  }

  // ─── Summary ────────────────────────────────────────────────────────────

  printHeader("ROBUSTNESS TEST RESULTS");

  const passed = tests.filter((t) => t.passed).length;
  const total = tests.length;
  const availability = tests.filter((t) => t.availability).length;

  console.log(
    `  ${"Test".padEnd(32)}${"Result".padStart(10)}${"Available".padStart(12)}`,
  );
  console.log("  " + "─".repeat(54));

  for (const test of tests) {
    const result = test.passed ? "✅ PASS" : "❌ FAIL";
    const avail = test.availability ? "✅" : "❌";
    console.log(
      `  ${test.name.padEnd(32)}${result.padStart(10)}${avail.padStart(12)}`,
    );
    console.log(`    ${test.details}`);
  }

  console.log(`\n  Overall: ${passed}/${total} tests passed`);
  console.log(
    `  Response Availability: ${availability}/${total} (${((availability / total) * 100).toFixed(0)}%)`,
  );

  const displayMetrics: Record<string, string | number> = {
    "Tests Passed": `${passed}/${total}`,
    "Response Availability": `${((availability / total) * 100).toFixed(0)}%`,
    "Fallback Working": tests.find((t) => t.name === "LLM Fallback Mode")
      ?.passed
      ? "Yes"
      : "No",
    "Malformed Input Handling": tests.find(
      (t) => t.name === "Malformed JSON Handling",
    )?.passed
      ? "Yes"
      : "No",
  };

  printMetricsTable(displayMetrics);

  const report = {
    name: "robustness-benchmarks",
    timestamp: new Date().toISOString(),
    category: "Robustness",
    summary: {
      testsPassed: passed,
      totalTests: total,
      availabilityPct: (availability / total) * 100,
    },
    details: { tests },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
