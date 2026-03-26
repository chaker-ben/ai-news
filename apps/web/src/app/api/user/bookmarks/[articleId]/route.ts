import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@ai-news/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId } = await params;

  await prisma.bookmark.deleteMany({
    where: { userId, articleId },
  });

  return NextResponse.json({ data: { deleted: true } });
}
