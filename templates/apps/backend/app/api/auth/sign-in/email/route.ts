/**
 * サインイン前の事前チェックを行うカスタムラッパー
 * 承認待ち・拒否・無効化状態のユーザーを弾き、Better Auth に委譲する
 */
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { USER_APPROVAL_STATUS } from "@/lib/user-approval";

export async function POST(request: NextRequest) {
  const cloned = request.clone();

  try {
    const body = await cloned.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ message: "メールアドレスを入力してください。" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        approvalStatus: true,
        isActive: true,
      },
    });

    if (!user) {
      // 一致するユーザーがいない場合は従来のハンドラーで統一的なメッセージにする
      return auth.handler(request);
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          message: "アカウントが無効化されています。管理者にお問い合わせください。",
          code: "ACCOUNT_DISABLED",
        },
        { status: 403 }
      );
    }

    if (user.approvalStatus === USER_APPROVAL_STATUS.PENDING) {
      return NextResponse.json(
        {
          message: "現在承認待ちです。承認が完了するまでログインできません。",
          code: "PENDING_APPROVAL",
        },
        { status: 403 }
      );
    }

    if (user.approvalStatus === USER_APPROVAL_STATUS.REJECTED) {
      return NextResponse.json(
        {
          message: "このアカウントは利用を拒否されています。",
          code: "REJECTED",
        },
        { status: 403 }
      );
    }
  } catch (error) {
    logger.error("Invalid sign-in payload", error);
    return NextResponse.json({ message: "リクエスト形式が不正です。" }, { status: 400 });
  }

  return auth.handler(request);
}

// EOF
