// Next.js の API ルートを実装する。
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildCorsHeaders } from "@/lib/api/cors";
import { logger } from "@/lib/logger";
import { type RegisterUserResult, registerUserWithEmail } from "@/lib/user-registration";
import { VALIDATION_LIMITS } from "@/lib/validation-constants";

const bodySchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD.MIN_LENGTH, "パスワードは8文字以上で入力してください。")
    .max(VALIDATION_LIMITS.PASSWORD.MAX_LENGTH, "パスワードが長すぎます。"),
  name: z
    .string()
    .max(VALIDATION_LIMITS.NAME.MAX_LENGTH, "氏名は120文字以内で入力してください。")
    .optional(),
});

export function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: buildCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" },
        { status: 400, headers: buildCorsHeaders(request) }
      );
    }

    const result = await registerUserWithEmail({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      headers: request.headers,
      autoCreateSession: false,
    });

    const responseBody: RegisterUserResult & {
      message: string;
    } = {
      ...result,
      message:
        result.status === "pending"
          ? "登録申請を受け付けました。承認完了後にログインできるようになります。"
          : "ユーザー登録が完了しました。ログインを続行してください。",
    };

    return NextResponse.json(responseBody, { status: 201, headers: buildCorsHeaders(request) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ユーザー登録処理中にエラーが発生しました。";
    logger.error("Failed to sign up user", error);
    return NextResponse.json({ message }, { status: 400, headers: buildCorsHeaders(request) });
  }
}

// EOF
