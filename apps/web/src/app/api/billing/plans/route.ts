import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";

export async function GET() {
  const plans = await prisma.billingPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ data: plans });
}
