import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { billingPlan: true },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: subscription });
}
