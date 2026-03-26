import { prisma } from "@ai-news/db";
import { airwallexRequest } from "./airwallex-api";

interface AirwallexCustomer {
  id: string;
  email: string;
  merchant_customer_id: string;
}

export async function getOrCreateCustomer(userId: string): Promise<string> {
  // Check if user already has an Airwallex customer ID
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { airwallexCustomerId: true },
  });

  if (subscription?.airwallexCustomerId) {
    return subscription.airwallexCustomerId;
  }

  // Get user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });

  if (!user) throw new Error("User not found");

  // Create Airwallex customer
  const customer = await airwallexRequest<AirwallexCustomer>(
    "POST",
    "/api/v1/pa/customers/create",
    {
      email: user.email,
      merchant_customer_id: userId,
      first_name: user.firstName || undefined,
      last_name: user.lastName || undefined,
    },
  );

  // Save customer ID
  await prisma.subscription.update({
    where: { userId },
    data: { airwallexCustomerId: customer.id },
  });

  return customer.id;
}
