/**
 * API ルートから呼び出すセッション検証ヘルパー。
 * - Authorization ヘッダー (Bearer) または `x-session-token` からトークンを抽出
 * - Prisma を用いてセッションレコードを照会し、有効期限を検査
 * - Fallback として Better Auth の `getSessionFromHeaders` を利用
 */
import { getSessionFromHeaders } from "@/lib/auth-server";
import prisma from "@/lib/db";
import { logger } from "@/lib/logger";
import { VALIDATION_LIMITS } from "@/lib/validation-constants";

type ApiSession = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
    image: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

/**
 * API ルートから呼び出すためのセッション取得ヘルパー。
 * Better Auth の API を使用してセッションを検証・取得する。
 */
export async function getApiSession(request: Request): Promise<ApiSession | null> {
  try {
    const authHeader = request.headers.get("authorization");
    const tokenFromHeader = authHeader?.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(VALIDATION_LIMITS.AUTH.BEARER_PREFIX_LENGTH).trim()
      : request.headers.get("x-session-token")?.trim();

    if (tokenFromHeader) {
      // API クライアントが直接トークンを送信している場合は、Prisma 経由でセッションを検証する
      const sessionRecord = await prisma.session.findUnique({
        where: { token: tokenFromHeader },
        include: {
          user: true,
        },
      });

      if (sessionRecord && sessionRecord.expiresAt > new Date() && sessionRecord.user) {
        return {
          user: sessionRecord.user as ApiSession["user"],
          session: {
            id: sessionRecord.id,
            expiresAt: sessionRecord.expiresAt,
            token: sessionRecord.token,
            ipAddress: sessionRecord.ipAddress,
            userAgent: sessionRecord.userAgent,
            userId: sessionRecord.userId,
            createdAt: sessionRecord.createdAt,
            updatedAt: sessionRecord.updatedAt,
          },
        };
      }
    }

    const session = await getSessionFromHeaders(request.headers);

    if (!session) {
      // Better Auth からも取得できなければ未ログインとして扱う
      return null;
    }

    return {
      user: session.user as ApiSession["user"],
      session: session.session as ApiSession["session"],
    };
  } catch (error) {
    logger.error("❌ getApiSession - error:", error);
    return null;
  }
}

// EOF
