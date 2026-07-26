import { fetcher } from "@/lib/coingecko.actions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const data = await fetcher<{ coins: { item: TrendingCoin["item"] }[] }>(
      "/search/trending",
      undefined,
      300,
    );
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load trending";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
