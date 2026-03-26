import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

// List members
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  try {
    // Verify user is a member
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
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
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error("[API] list members error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Invite member
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await params;

  try {
    // Verify user is owner or admin
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = inviteSchema.parse(await request.json());

    // Find user by email
    const invitedUser = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found. They need to sign up first." },
        { status: 404 },
      );
    }

    // Check team member limits
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Check plan limits (team = 5, enterprise = unlimited)
    const maxMembers = org.plan === "enterprise" ? Infinity : 5;
    if (org.members.length >= maxMembers) {
      return NextResponse.json(
        { error: "Member limit reached for your plan" },
        { status: 403 },
      );
    }

    const member = await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: invitedUser.id,
        role: body.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    // Unique constraint = already a member
    if ((error as Record<string, unknown>).code === "P2002") {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 },
      );
    }
    console.error("[API] invite member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
