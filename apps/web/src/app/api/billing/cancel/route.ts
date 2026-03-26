import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";
import { airwallexRequest } from "@/lib/airwallex-api";

const cancelSchema = z.object({
  reason: z.string().optional(),
  cancelImmediately: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = cancelSchema.parse(await request.json());

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 },
      );
    }

    if (subscription.plan === "free") {
      return NextResponse.json(
        { error: "Cannot cancel free plan" },
        { status: 400 },
      );
    }

    // Cancel on Airwallex if subscription exists there
    if (subscription.airwallexSubscriptionId) {
      try {
        await airwallexRequest(
          "POST",
          `/api/v1/pa/subscriptions/${subscription.airwallexSubscriptionId}/cancel`,
          { cancel_at_period_end: !body.cancelImmediately },
        );
      } catch (airwallexError) {
        console.error("[API] Airwallex cancel error:", airwallexError);
        // Continue with local cancellation even if Airwallex fails
      }
    }

    // Update local subscription
    const freePlan = await prisma.billingPlan.findUnique({
      where: { slug: "free" },
    });

    if (body.cancelImmediately) {
      await prisma.subscription.update({
        where: { userId },
        data: {
          status: "cancelled",
          paymentStatus: "cancelled",
          cancellationReason: body.reason,
          cancelAtPeriodEnd: false,
          ...(freePlan
            ? {
                billingPlanId: freePlan.id,
                plan: "free",
                amount: 0,
              }
            : {}),
        },
      });
    } else {
      await prisma.subscription.update({
        where: { userId },
        data: {
          cancelAtPeriodEnd: true,
          cancellationReason: body.reason,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: body.cancelImmediately ? "cancelled" : "cancel_at_period_end",
        cancel_at_period_end: !body.cancelImmediately,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] cancel error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
