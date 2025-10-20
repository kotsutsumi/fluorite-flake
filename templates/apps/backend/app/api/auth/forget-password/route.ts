// パスワードリセットメールをリクエストするエンドポイント。
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCorsHeaders, resolveAllowedOrigin } from "@/lib/api/cors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

const TRAILING_SLASH_REGEX = /\/$/;

const bodySchema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません。"),
});

const resolveRedirectURL = (request: NextRequest) => {
  const explicit =
    process.env.AUTH_RESET_REDIRECT_URL ?? process.env.AUTH_PASSWORD_RESET_REDIRECT_URL;

  if (explicit) {
    return explicit.replace(TRAILING_SLASH_REGEX, "");
  }

  const environmentOrigin = process.env.WEB_APP_URL ?? process.env.NEXT_PUBLIC_WEB_APP_URL;
  /* c8 ignore next */
  const base = environmentOrigin ?? resolveAllowedOrigin(request);

  return `${base.replace(TRAILING_SLASH_REGEX, "")}/reset-password`;
};

export function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      const firstIssueMessage = parsed.error.issues[0]?.message;
      /* c8 ignore next */
      const validationMessage = firstIssueMessage ?? "入力内容を確認してください。";

      return NextResponse.json(
        { message: validationMessage },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const redirectTo = resolveRedirectURL(request);

    await auth.api.forgetPassword({
      body: {
        email: parsed.data.email,
        redirectTo,
      },
      headers: request.headers,
    });

    return NextResponse.json(
      {
        message: "パスワードリセットリンクをメールで送信しました。メールをご確認ください。",
      },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    logger.error("Failed to send password reset email", error);

    return NextResponse.json(
      { message: "パスワードリセットリンクの送信に失敗しました。" },
      { status: 400, headers: buildCorsHeaders(request) }
    );
  }
}

// EOF
