import { NextResponse } from "next/server";
import { fetcher } from "@/lib/coingecko.actions";
import { computeQuantSnapshot } from "@/lib/quant";
import { analyzeWithLLM } from "@/lib/llm";

const cache = new Map<string, { result: unknown; expiresAt: number }>();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cacheKey = `analyze:${id}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.result, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  }

  try {
    const [coinData, ohlcData] = await Promise.all([
      fetcher<CoinDetailsData>(`/coins/${id}`, { localization: false }, 300),
      fetcher<OHLCData[]>(
        `/coins/${id}/ohlc`,
        { vs_currency: "usd", days: 1, precision: "full" },
        300,
      ),
    ]);

    if (!ohlcData || ohlcData.length < 50) {
      return NextResponse.json(
        { error: "Insufficient OHLC data for analysis" },
        { status: 422 },
      );
    }

    const snapshot = computeQuantSnapshot(coinData, ohlcData);
    const llmResult = await analyzeWithLLM(snapshot);

    const result = {
      coinId: id,
      timestamp: Date.now(),
      quant: snapshot,
      llm: llmResult,
    };

    cache.set(cacheKey, { result, expiresAt: now + 60_000 });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error(`[api/coins/${id}/analyze]`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to analyze coin", message },
      { status: 500 },
    );
  }
}
