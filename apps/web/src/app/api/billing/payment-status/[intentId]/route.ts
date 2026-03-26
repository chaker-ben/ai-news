import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";
import { airwallexRequest } from "@/lib/airwallex-api";

interface PaymentIntentStatus {
  id: string;
  status: string; // SUCCEEDED, PENDING, FAILED, CANCELLED
  latest_payment_attempt?: {
    error?: {
      code: string;
      message: string;
    };
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ intentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { intentId } = await params;

  try {
    const intent = await airwallexRequest<PaymentIntentStatus>(
      "GET",
      `/api/v1/pa/payment_intents/${intentId}`,
    );

    // Fallback activation if webhook hasn't fired yet
    if (intent.status === "SUCCEEDED") {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (subscription && subscription.status !== "active") {
        const billingCycleDays =
          subscription.billingCycle === "yearly" ? 365 : 30;

        await prisma.subscription.update({
          where: { userId },
          data: {
            status: "active",
            paymentStatus: "paid",
            startDate: new Date(),
            nextBillingDate: new Date(
              Date.now() + billingCycleDays * 24 * 60 * 60 * 1000,
            ),
          },
        });

        // Update invoice
        await prisma.invoice.updateMany({
          where: { airwallexPaymentIntentId: intentId },
          data: { status: "paid", paymentStatus: "paid", paidAt: new Date() },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: intent.status,
        error_code: intent.latest_payment_attempt?.error?.code,
        payment_intent_id: intentId,
        subscription_activated: intent.status === "SUCCEEDED",
      },
    });
  } catch (error) {
    console.error("[API] payment-status error:", error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 },
    );
  }
}
