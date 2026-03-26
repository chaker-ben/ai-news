import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@ai-news/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId },
    include: { article: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: bookmarks });
}

const addBookmarkSchema = z.object({
  articleId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { articleId } = addBookmarkSchema.parse(await request.json());

    const bookmark = await prisma.bookmark.create({
      data: { userId, articleId },
    });

    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    // Duplicate bookmark (Prisma unique constraint violation)
    if ((error as Record<string, unknown>).code === "P2002") {
      return NextResponse.json(
        { error: "Article already bookmarked" },
        { status: 409 }
      );
    }
    console.error("[API] bookmark error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
