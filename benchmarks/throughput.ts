/**
 * #6 Throughput Benchmark ⭐⭐⭐⭐
 *
 * Measures system performance under increasing load:
 * 10, 50, 100, 500, 1000 coins processed.
 * Tracks CPU usage, memory, and response time.
 *
 * Usage: npx tsx benchmarks/throughput.ts
 */

import { performance } from "node:perf_hooks";
import * as os from "node:os";
import {
  generateOHLC,
  toOHLCData,
  makeCoinData,
  printHeader,
  saveReport,
  formatMs,
} from "./lib/bench-utils.js";
import { computeQuantSnapshot } from "../lib/quant.js";

const CONFIG = {
  coinCounts: [10, 50, 100, 500, 1000],
  candlesPerCoin: 200,
  basePrice: 100,
};

interface ThroughputResult {
  coinCount: number;
  totalTimeMs: number;
  avgTimePerCoinMs: number;
  throughputPerSec: number;
  memoryMB: number;
  cpuUsagePct: number;
}

function getMemoryMB(): number {
  const mem = process.memoryUsage();
  return Math.round(mem.heapUsed / (1024 * 1024));
}

function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    totalIdle += cpu.times.idle;
    totalTick += Object.values(cpu.times).reduce((a, b) => a + b, 0);
  }
  return (1 - totalIdle / totalTick) * 100;
}

async function runThroughputTest(coinCount: number): Promise<ThroughputResult> {
  const startMem = getMemoryMB();
  const startCpu = getCpuUsage();

  const t0 = performance.now();

  // Process coins in parallel batches of 10
  const batchSize = 10;
  for (let batch = 0; batch < coinCount; batch += batchSize) {
    const batchEnd = Math.min(batch + batchSize, coinCount);
    const promises: Promise<void>[] = [];

    for (let i = batch; i < batchEnd; i++) {
      promises.push(
        new Promise((resolve) => {
          const bars = generateOHLC(CONFIG.candlesPerCoin, {
            startPrice: CONFIG.basePrice + i * 10,
            regime: "mixed",
            seed: i * 100,
          });
          const ohlcData = toOHLCData(bars);
          const coinData = makeCoinData(
            `coin-${i}`,
            `C${i}`,
            `Coin ${i}`,
            bars[bars.length - 1].close,
          );
          try {
            computeQuantSnapshot(coinData, ohlcData);
          } catch {
            // ignore
          }
          resolve();
        }),
      );
    }

    await Promise.all(promises);
  }

  const totalTimeMs = performance.now() - t0;
  const endMem = getMemoryMB();
  const endCpu = getCpuUsage();

  return {
    coinCount,
    totalTimeMs,
    avgTimePerCoinMs: totalTimeMs / coinCount,
    throughputPerSec: (coinCount / totalTimeMs) * 1000,
    memoryMB: endMem - startMem,
    cpuUsagePct: (startCpu + endCpu) / 2,
  };
}

async function main() {
  printHeader("CRYPTOTRADE THROUGHPUT BENCHMARKS");

  const results: ThroughputResult[] = [];

  for (const count of CONFIG.coinCounts) {
    console.log(`  Testing ${count} coins...`);
    const result = await runThroughputTest(count);
    results.push(result);
    console.log(
      `    Time: ${formatMs(result.totalTimeMs)} | Avg/coin: ${formatMs(result.avgTimePerCoinMs)} | Throughput: ${result.throughputPerSec.toFixed(1)} coins/s | Memory: ${result.memoryMB}MB\n`,
    );
  }

  printHeader("THROUGHPUT SUMMARY");

  const header = `  ${"Coins".padStart(8)}${"Total Time".padStart(14)}${"Avg/Coin".padStart(12)}${"Throughput".padStart(14)}${"Mem Δ".padStart(10)}`;
  console.log(header);
  console.log("  " + "─".repeat(58));

  for (const r of results) {
    console.log(
      `  ${String(r.coinCount).padStart(8)}${formatMs(r.totalTimeMs).padStart(14)}${formatMs(r.avgTimePerCoinMs).padStart(12)}${`${r.throughputPerSec.toFixed(1)}/s`.padStart(14)}${`${r.memoryMB}MB`.padStart(10)}`,
    );
  }

  console.log();

  const report = {
    name: "throughput-benchmarks",
    timestamp: new Date().toISOString(),
    category: "Throughput",
    summary: {
      maxThroughput: Math.max(...results.map((r) => r.throughputPerSec)),
      maxCoins: CONFIG.coinCounts[CONFIG.coinCounts.length - 1],
      peakMemoryMB: Math.max(...results.map((r) => r.memoryMB)),
    },
    details: { results, config: CONFIG },
  };

  const savedPath = saveReport(report);
  console.log(`  Report saved to: ${savedPath}\n`);
}

main().catch(console.error);
