import { NextResponse } from "next/server";
import { fetcher } from "@/lib/coingecko.actions";
import { computeQuantSnapshot } from "@/lib/quant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error(`[api/coins/${id}/quant]`, error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to compute quant snapshot", message },
      { status: 500 },
    );
  }
}
