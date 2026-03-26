import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@ai-news/db";
import { verifyWebhookSignature } from "@/lib/airwallex-webhook";

export async function POST(request: NextRequest) {
  const WEBHOOK_SECRET = process.env.AIRWALLEX_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing AIRWALLEX_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-signature") || "";

  if (!verifyWebhookSignature(body, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    id: string;
    name: string;
    data?: { object?: { id?: string } };
  };
  const eventId = event.id;
  const eventType = event.name;

  // Idempotency check
  const existingLog = await prisma.paymentWebhookLog.findUnique({
    where: { airwallexEventId: eventId },
  });
  if (existingLog?.status === "processed") {
    return NextResponse.json({ received: true });
  }

  // Log webhook
  const webhookLog = await prisma.paymentWebhookLog.create({
    data: {
      eventType,
      airwallexEventId: eventId,
      payload: event,
      status: "processing",
    },
  });

  try {
    const paymentIntentId = event.data?.object?.id;

    if (eventType === "payment_intent.succeeded" && paymentIntentId) {
      const subscription = await prisma.subscription.findFirst({
        where: { lastPaymentIntentId: paymentIntentId },
      });

      if (subscription) {
        const billingCycleDays =
          subscription.billingCycle === "yearly" ? 365 : 30;

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "active",
            paymentStatus: "paid",
            startDate: new Date(),
            nextBillingDate: new Date(
              Date.now() + billingCycleDays * 24 * 60 * 60 * 1000,
            ),
          },
        });

        // Mark invoice paid
        await prisma.invoice.updateMany({
          where: { airwallexPaymentIntentId: paymentIntentId },
          data: { status: "paid", paymentStatus: "paid", paidAt: new Date() },
        });
      }
    }

    if (
      eventType === "payment_intent.requires_payment_method" &&
      paymentIntentId
    ) {
      const subscription = await prisma.subscription.findFirst({
        where: { lastPaymentIntentId: paymentIntentId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { paymentStatus: "past_due" },
        });

        await prisma.invoice.updateMany({
          where: { airwallexPaymentIntentId: paymentIntentId },
          data: { paymentStatus: "unpaid" },
        });
      }
    }

    if (eventType === "payment_intent.cancelled" && paymentIntentId) {
      const subscription = await prisma.subscription.findFirst({
        where: { lastPaymentIntentId: paymentIntentId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "cancelled", paymentStatus: "cancelled" },
        });

        await prisma.invoice.updateMany({
          where: { airwallexPaymentIntentId: paymentIntentId },
          data: { status: "cancelled", paymentStatus: "cancelled" },
        });
      }
    }

    // Mark webhook processed
    await prisma.paymentWebhookLog.update({
      where: { id: webhookLog.id },
      data: { status: "processed", processedAt: new Date() },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing:", error);

    await prisma.paymentWebhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
    });

    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 },
    );
  }
}
