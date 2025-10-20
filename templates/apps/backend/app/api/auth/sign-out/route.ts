/**
 * サインアウト API エンドポイント
 * Better Auth の signOut を呼び出し、セッション Cookie を無効化する。
 */
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    await auth.api.signOut({
      headers: request.headers,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Sign-out failed", error);
    return NextResponse.json({ message: "Failed to sign out" }, { status: 500 });
  }
}

// EOF
