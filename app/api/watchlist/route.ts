import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.watchlistItem.findMany({
      orderBy: { addedAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[watchlist GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coinId, coinName, coinSymbol, coinImage } = body;

    if (!coinId || !coinName) {
      return NextResponse.json(
        { error: "Missing required fields: coinId, coinName" },
        { status: 400 },
      );
    }

    // Upsert — add if not exists, otherwise ignore
    const item = await prisma.watchlistItem.upsert({
      where: { coinId },
      update: {},
      create: {
        coinId,
        coinName,
        coinSymbol: coinSymbol || "",
        coinImage: coinImage || "",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[watchlist POST]", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 },
    );
  }
}
