import { fetcher } from "@/lib/coingecko.actions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ coins: [] }, { status: 200 });
  }

  try {
    const data = await fetcher<{ coins: SearchCoin[] }>(
      "/search",
      { query: query.trim() },
      60,
    );
    return NextResponse.json(
      { coins: data.coins.slice(0, 10) },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
