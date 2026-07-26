import { NextResponse } from "next/server";
import { fetcher } from "@/lib/coingecko.actions";
import {
  computeQuantSnapshot,
  rankSnapshots,
  QuantSnapshot,
} from "@/lib/quant";

const cache = new Map<string, { data: unknown; expiresAt: number }>();

export async function GET() {
  const cacheKey = "trends:top50";
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
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
        } catch (error) {
          console.error(`[trends] skip ${coin.id}:`, error);
        }
      }),
    );

    const ranked = rankSnapshots(snapshots);

    const result = {
      timestamp: Date.now(),
      count: ranked.length,
      coins: ranked.slice(0, 20),
    };

    cache.set(cacheKey, { data: result, expiresAt: now + 60_000 });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("[api/trends]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load trends", message },
      { status: 500 },
    );
  }
}
