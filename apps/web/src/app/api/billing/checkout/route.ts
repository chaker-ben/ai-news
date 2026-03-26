import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";
import { getOrCreateCustomer } from "@/lib/airwallex-customer";
import { airwallexRequest } from "@/lib/airwallex-api";

const checkoutSchema = z.object({
  planSlug: z.enum(["free", "pro", "team", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
  currency: z.enum(["USD", "EUR", "SAR"]).default("USD"),
  startTrial: z.boolean().default(false),
});

interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = checkoutSchema.parse(await request.json());
    const { planSlug, billingCycle, currency, startTrial } = body;

    // Get billing plan
    const plan = await prisma.billingPlan.findUnique({
      where: { slug: planSlug },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Get or create subscription
    const existingSub = await prisma.subscription.findUnique({
      where: { userId },
    });

    // Handle free plan — no payment needed
    if (planSlug === "free") {
      if (existingSub) {
        await prisma.subscription.update({
          where: { userId },
          data: {
            billingPlanId: plan.id,
            plan: "free",
            status: "active",
            paymentStatus: "paid",
            amount: 0,
            billingCycle: "monthly",
          },
        });
      }
      return NextResponse.json({
        success: true,
        data: { type: "free", subscription_id: existingSub?.id },
      });
    }

    // Calculate amount
    const amount =
      billingCycle === "yearly" && plan.yearlyPrice
        ? plan.yearlyPrice
        : plan.price;

    // Ensure Airwallex customer exists
    const customerId = await getOrCreateCustomer(userId);

    // Create payment intent
    const idempotencyKey = `checkout_${userId}_${planSlug}_${Date.now()}`;

    const paymentIntent = await airwallexRequest<PaymentIntentResponse>(
      "POST",
      "/api/v1/pa/payment_intents/create",
      {
        amount,
        currency: currency.toLowerCase(),
        merchant_order_id: `sub_${userId}_${planSlug}_${Date.now()}`,
        customer_id: customerId,
        request_id: idempotencyKey,
        metadata: {
          user_id: userId,
          plan_slug: planSlug,
          billing_cycle: billingCycle,
        },
        ...(startTrial ? { auto_capture: false } : {}),
      },
      idempotencyKey,
    );

    // Create/update subscription in pending state
    const trialEndDate = startTrial
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : undefined;

    const subscriptionData = {
      billingPlanId: plan.id,
      plan: planSlug,
      status: startTrial ? ("trialing" as const) : ("inactive" as const),
      billingCycle: billingCycle as "monthly" | "yearly",
      amount,
      currency,
      paymentStatus: startTrial ? ("trial" as const) : ("unpaid" as const),
      lastPaymentIntentId: paymentIntent.id,
      airwallexCustomerId: customerId,
      ...(trialEndDate ? { trialEndDate } : {}),
    };

    if (existingSub) {
      await prisma.subscription.update({
        where: { userId },
        data: subscriptionData,
      });
    }

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}-${userId.slice(-4)}`;
    const periodEnd = new Date(
      Date.now() +
        (billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
    );

    await prisma.invoice.create({
      data: {
        subscriptionId: existingSub?.id || "",
        invoiceNumber,
        amount,
        currency,
        status: "pending",
        paymentStatus: startTrial ? "authorized" : "unpaid",
        airwallexPaymentIntentId: paymentIntent.id,
        periodStart: new Date(),
        periodEnd,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        type: startTrial ? "trial" : "payment_required",
        subscription_id: existingSub?.id,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount,
        currency,
        requires_payment: true,
        ...(trialEndDate
          ? { trial_end_date: trialEndDate.toISOString() }
          : {}),
        airwallex_customer_id: customerId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
