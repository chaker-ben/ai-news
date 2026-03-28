/**
 * Create an admin user via Clerk API + seed in local DB with Enterprise plan.
 *
 * Usage: npx tsx scripts/create-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

// Load root .env
config({ path: resolve(__dirname, "../.env") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY in .env");
  process.exit(1);
}

const ADMIN_EMAIL = "chaker.info@gmail.com";
const ADMIN_PHONE = "+212660670020";
const ADMIN_PASSWORD = "AiNews2026!";
const ADMIN_FIRST_NAME = "Chaker";
const ADMIN_LAST_NAME = "Ben Moussa";

async function main() {
  // 1. Find or create user in Clerk
  console.log(`Looking up ${ADMIN_EMAIL} in Clerk...`);

  // Search for existing user
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(ADMIN_EMAIL)}`,
    { headers: { "Authorization": `Bearer ${CLERK_SECRET_KEY}` } },
  );
  const users = await searchRes.json();

  let userId: string;

  if (Array.isArray(users) && users.length > 0) {
    userId = users[0].id;
    console.log(`Found existing Clerk user: ${userId}`);
  } else {
    // Create user with email + phone
    console.log("Creating user in Clerk...");
    const createRes = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [ADMIN_EMAIL],
        password: ADMIN_PASSWORD,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        skip_password_checks: true,
        skip_password_requirement: true,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      console.error("Clerk error:", JSON.stringify(err, null, 2));
      process.exit(1);
    }

    const newUser = await createRes.json();
    userId = newUser.id;
    console.log(`Created Clerk user: ${userId}`);
  }

  console.log(`User ID: ${userId} (${ADMIN_EMAIL})`);

  // 2. Seed in local DB
  console.log("Seeding user in database...");

  // Dynamic import to pick up the generated Prisma client
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Get enterprise plan
    const enterprisePlan = await prisma.billingPlan.findUnique({
      where: { slug: "enterprise" },
    });

    if (!enterprisePlan) {
      console.error("Enterprise plan not found. Run: pnpm db:seed");
      process.exit(1);
    }

    // Upsert user
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: ADMIN_EMAIL,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
        preferences: {
          create: {
            digestTime: "08:00",
            timezone: "Europe/Paris",
            language: "fr",
            emailNotifications: true,
            digestEnabled: true,
            weeklyDigestEnabled: true,
            minScoreAlert: 5.0,
            maxArticlesDigest: 15,
          },
        },
        subscription: {
          create: {
            billingPlanId: enterprisePlan.id,
            plan: "enterprise",
            status: "active",
            paymentStatus: "paid",
            amount: 0,
            currency: "USD",
            billingCycle: "yearly",
            startDate: new Date(),
            nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      update: {
        email: ADMIN_EMAIL,
        firstName: ADMIN_FIRST_NAME,
        lastName: ADMIN_LAST_NAME,
      },
    });

    // Select all categories for admin
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
    });
    if (prefs) {
      const categories = await prisma.category.findMany({ where: { isActive: true } });
      // Clear existing
      await prisma.userCategory.deleteMany({ where: { preferencesId: prefs.id } });
      // Add all
      await prisma.userCategory.createMany({
        data: categories.map((c) => ({
          preferencesId: prefs.id,
          categoryId: c.id,
        })),
      });
      console.log(`Assigned ${categories.length} categories`);
    }

    console.log("\n========================================");
    console.log("  Admin account created successfully!");
    console.log("========================================");
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Plan:     Enterprise (lifetime)`);
    console.log(`  Clerk ID: ${userId}`);
    console.log("========================================");
    console.log(`\n  Login at: http://localhost:3000/fr/sign-in`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
