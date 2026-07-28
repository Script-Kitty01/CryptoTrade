import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await prisma.portfolioHolding.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[portfolio DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete holding" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, buyPriceUsd, notes } = body;

    const holding = await prisma.portfolioHolding.update({
      where: { id },
      data: {
        ...(quantity != null && { quantity: Number(quantity) }),
        ...(buyPriceUsd != null && { buyPriceUsd: Number(buyPriceUsd) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json(holding);
  } catch (error) {
    console.error("[portfolio PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update holding" },
      { status: 500 },
    );
  }
}
