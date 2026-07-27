import { NextResponse } from "next/server";
import { fetcher } from "@/lib/coingecko.actions";
import { computeQuantSnapshot, rankSnapshots, QuantSnapshot } from "@/lib/quant";
import { getLLMConfig } from "@/lib/llm";

const cache = new Map<string, { data: unknown; expiresAt: number }>();

function buildMarketPrompt(snapshots: QuantSnapshot[]): string {
  const lines = snapshots.map(
    (s, i) =>
      `${i + 1}. ${s.name} (${s.symbol}) — $${s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Signal: ${s.signal} | Confidence: ${s.confidence}% | Composite: ${s.scores.composite.toFixed(1)} | Momentum: ${s.scores.momentum.toFixed(1)} | Trend: ${s.scores.trend.toFixed(1)} | Volume: ${s.scores.volume.toFixed(1)}`,
  );

  return `You are a senior crypto market analyst. Summarize the current market conditions based on the top-ranked coins below. Return ONLY a JSON object with no markdown, no commentary, no code fences.

Top coins by composite quant score:
${lines.join("\n")}

Return this exact JSON structure:
{
  "marketBias": "bullish|bearish|neutral",
  "summary": "2-3 sentence market overview describing the dominant trend, key themes, and overall risk environment",
  "keyTheme": "one short phrase capturing the main market narrative (e.g. 'risk-on momentum', 'defensive rotation', 'mixed with alt strength')",
  "riskLevel": "low|medium|high",
  "topSectors": ["sector or theme 1", "sector or theme 2"]
}

Rules:
- marketBias should reflect the dominant signal across the top coins.
- summary should be concise and actionable.
- keyTheme should be a short, punchy phrase.
- topSectors are inferred themes (e.g. "Layer 1 strength", "DeFi momentum", "Meme coin speculation").
- Never invent data not shown above.`;
}

interface MarketSummary {
  marketBias: "bullish" | "bearish" | "neutral";
  summary: string;
  keyTheme: string;
  riskLevel: "low" | "medium" | "high";
  topSectors: string[];
}

function parseMarketSummary(text: string): MarketSummary | null {
  const clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace)
    return null;

  try {
    const parsed = JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    const validBias = ["bullish", "bearish", "neutral"];
    const validRisk = ["low", "medium", "high"];

    return {
      marketBias: validBias.includes(parsed.marketBias)
        ? parsed.marketBias
        : "neutral",
      summary:
        typeof parsed.summary === "string" && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : "Market conditions are mixed with no clear directional bias.",
      keyTheme:
        typeof parsed.keyTheme === "string" && parsed.keyTheme.trim().length > 0
          ? parsed.keyTheme.trim()
          : "Mixed signals",
      riskLevel: validRisk.includes(parsed.riskLevel)
        ? parsed.riskLevel
        : "medium",
      topSectors: Array.isArray(parsed.topSectors)
        ? parsed.topSectors
            .filter((x: unknown) => typeof x === "string")
            .slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

function fallbackMarketSummary(snapshots: QuantSnapshot[]): MarketSummary {
  const buyCount = snapshots.filter((s) =>
    ["strong_buy", "buy"].includes(s.signal),
  ).length;
  const sellCount = snapshots.filter((s) =>
    ["strong_sell", "sell"].includes(s.signal),
  ).length;

  const bias: MarketSummary["marketBias"] =
    buyCount > sellCount + 2
      ? "bullish"
      : sellCount > buyCount + 2
        ? "bearish"
        : "neutral";

  const avgVolatility =
    snapshots.reduce((sum, s) => sum + s.scores.volatilityRisk, 0) /
    snapshots.length;
  const risk: MarketSummary["riskLevel"] =
    avgVolatility > 60 ? "high" : avgVolatility > 40 ? "medium" : "low";

  return {
    marketBias: bias,
    summary: `Based on the top ${snapshots.length} coins by composite quant score, the market shows a ${bias} bias with ${risk} risk. ${buyCount} coins are bullish, ${sellCount} are bearish, and the rest are neutral.`,
    keyTheme: bias === "bullish" ? "Risk-on" : bias === "bearish" ? "Risk-off" : "Mixed",
    riskLevel: risk,
    topSectors: [],
  };
}

export async function GET() {
  const cacheKey = "trends:summary";
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    });
  }

  try {
    const marketData = await fetcher<CoinMarketData[]>(
      "/coins/markets",
      {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 50,
        page: 1,
        sparkline: false,
        price_change_percentage: "24h",
      },
      300,
    );

    const snapshots: QuantSnapshot[] = [];

    await Promise.all(
      marketData.map(async (coin) => {
        try {
          const ohlc = await fetcher<OHLCData[]>(
            `/coins/${coin.id}/ohlc`,
            { vs_currency: "usd", days: 7, precision: "full" },
            300,
          );
          if (ohlc && ohlc.length >= 30) {
            snapshots.push(computeQuantSnapshot(coin, ohlc));
          }
        } catch {
          // skip coins that fail OHLC fetch
        }
      }),
    );

    const ranked = rankSnapshots(snapshots);
    const top5 = ranked.slice(0, 5);

    if (top5.length === 0) {
      return NextResponse.json(
        { error: "Insufficient data for market summary" },
        { status: 422 },
      );
    }

    const config = getLLMConfig();
    let marketSummary: MarketSummary;

    if (config.enabled) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          config.timeoutMs,
        );

        const response = await fetch(`${config.baseUrl}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            prompt: buildMarketPrompt(top5),
            stream: false,
            format: "json",
            options: {
              temperature: 0.3,
              num_predict: 256,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = (await response.json()) as { response?: string };
          const parsed = parseMarketSummary(data.response || "");
          if (parsed) {
            marketSummary = parsed;
          } else {
            marketSummary = fallbackMarketSummary(top5);
          }
        } else {
          marketSummary = fallbackMarketSummary(top5);
        }
      } catch {
        marketSummary = fallbackMarketSummary(top5);
      }
    } else {
      marketSummary = fallbackMarketSummary(top5);
    }

    const result = {
      timestamp: Date.now(),
      coinCount: top5.length,
      totalAnalyzed: ranked.length,
      marketSummary,
    };

    cache.set(cacheKey, { data: result, expiresAt: now + 60_000 });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("[api/trends/summary]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate market summary", message },
      { status: 500 },
    );
  }
}
