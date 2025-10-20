// パスワードを更新するエンドポイント。
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildCorsHeaders } from "@/lib/api/cors";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { VALIDATION_LIMITS } from "@/lib/validation-constants";

const bodySchema = z.object({
  newPassword: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD.MIN_LENGTH, "パスワードは8文字以上で入力してください。")
    .max(VALIDATION_LIMITS.PASSWORD.MAX_LENGTH, "パスワードが長すぎます。"),
  token: z.string().optional(),
});

const querySchema = z.object({
  token: z.string().optional(),
});

const parseQuery = (request: NextRequest) =>
  querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error && typeof error.message === "string") {
    if (error.message.includes("INVALID_TOKEN")) {
      return "トークンが無効または期限切れです。再度リセットを申請してください。";
    }
    if (error.message.includes("PASSWORD_TOO_SHORT")) {
      return "パスワードは8文字以上で入力してください。";
    }
    if (error.message.includes("PASSWORD_TOO_LONG")) {
      return "パスワードが長すぎます。";
    }
    return error.message;
  }

  return "パスワードの更新に失敗しました。";
};

export function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    let payload: unknown = null;

    try {
      payload = await request.json();
    } catch (_error) {
      payload = {};
    }

    const parsedBody = bodySchema.safeParse(payload);

    if (!parsedBody.success) {
      const firstIssueMessage = parsedBody.error.issues[0]?.message;
      /* c8 ignore next */
      const validationMessage = firstIssueMessage ?? "入力内容を確認してください。";

      return NextResponse.json(
        { message: validationMessage },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const query = parseQuery(request);
    const token = parsedBody.data.token ?? query.token;

    if (!token) {
      return NextResponse.json(
        { message: "トークンが無効です。再度パスワードリセットを申請してください。" },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    await auth.api.resetPassword({
      body: {
        newPassword: parsedBody.data.newPassword,
        token,
      },
      query: { token },
      headers: request.headers,
    });

    return NextResponse.json(
      { message: "パスワードを更新しました。ログインしてください。" },
      { headers: buildCorsHeaders(request) }
    );
  } catch (error) {
    logger.error("Failed to reset password", error);
    const message = toErrorMessage(error);

    return NextResponse.json({ message }, { status: 400, headers: buildCorsHeaders(request) });
  }
}

// EOF
