import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const alerts = await prisma.priceAlert.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(alerts);
  } catch (error) {
    console.error("[alerts GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coinId, coinName, coinSymbol, targetPrice, direction } = body;

    if (!coinId || !coinName || targetPrice == null || !direction) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: coinId, coinName, targetPrice, direction",
        },
        { status: 400 },
      );
    }

    if (!["above", "below"].includes(direction)) {
      return NextResponse.json(
        { error: "direction must be 'above' or 'below'" },
        { status: 400 },
      );
    }

    const alert = await prisma.priceAlert.create({
      data: {
        coinId,
        coinName,
        coinSymbol: coinSymbol || "",
        targetPrice: Number(targetPrice),
        direction,
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("[alerts POST]", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 },
    );
  }
}
