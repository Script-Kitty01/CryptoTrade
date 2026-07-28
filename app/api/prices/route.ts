import { fetcher } from "@/lib/coingecko.actions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get("ids");

  if (!ids) {
    return NextResponse.json({ prices: [] }, { status: 200 });
  }

  try {
    const data = await fetcher<
      {
        id: string;
        current_price: number;
        price_change_percentage_24h: number;
      }[]
    >(
      "/coins/markets",
      {
        vs_currency: "usd",
        ids: ids,
        order: "market_cap_desc",
        per_page: "250",
        sparkline: "false",
      },
      30,
    );

    return NextResponse.json({ prices: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prices failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
