import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

const createOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
});

// List user's organizations
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
        memberCount: m.organization.members.length,
      })),
    });
  } catch (error) {
    console.error("[API] list orgs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Create organization
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = createOrgSchema.parse(await request.json());

    // Check subscription allows team features
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { billingPlan: true },
    });

    if (
      !subscription ||
      !["team", "enterprise"].includes(subscription.plan)
    ) {
      return NextResponse.json(
        { error: "Team plan required to create organizations" },
        { status: 403 },
      );
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({
      where: { slug: body.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 409 },
      );
    }

    const org = await prisma.organization.create({
      data: {
        name: body.name,
        slug: body.slug,
        ownerId: userId,
        plan: subscription.plan,
        members: {
          create: { userId, role: "owner" },
        },
      },
      include: { members: true },
    });

    return NextResponse.json({ data: org }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[API] create org error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
