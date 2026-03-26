import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ data: categories });
}
