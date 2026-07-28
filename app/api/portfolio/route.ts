import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const holdings = await prisma.portfolioHolding.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(holdings);
  } catch (error) {
    console.error("[portfolio GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      coinId,
      coinName,
      coinSymbol,
      coinImage,
      quantity,
      buyPriceUsd,
      buyDate,
      notes,
    } = body;

    if (!coinId || !coinName || quantity == null || buyPriceUsd == null) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: coinId, coinName, quantity, buyPriceUsd",
        },
        { status: 400 },
      );
    }

    const holding = await prisma.portfolioHolding.create({
      data: {
        coinId,
        coinName,
        coinSymbol: coinSymbol || "",
        coinImage: coinImage || "",
        quantity: Number(quantity),
        buyPriceUsd: Number(buyPriceUsd),
        buyDate: buyDate ? new Date(buyDate) : new Date(),
        notes: notes || null,
      },
    });

    return NextResponse.json(holding, { status: 201 });
  } catch (error) {
    console.error("[portfolio POST]", error);
    return NextResponse.json(
      { error: "Failed to add holding" },
      { status: 500 },
    );
  }
}
