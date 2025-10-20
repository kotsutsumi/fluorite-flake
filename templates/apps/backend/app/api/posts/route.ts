/**
 * 投稿APIエンドポイント（デモ用）
 * Turso接続確認用のCRUD操作
 */
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    logger.error("Database error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { title, content, authorEmail } = json;

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: authorEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: authorEmail,
          name: authorEmail.split("@")[0],
        },
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: true,
        authorId: user.id,
      },
      include: { author: true },
    });

    return NextResponse.json(post);
  } catch (error) {
    logger.error("Database error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

// EOF
