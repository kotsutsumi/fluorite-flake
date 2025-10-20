/**
 * API ルート用の CORS ヘルパー。
 * - リクエストヘッダーの Origin を優先し、なければ環境変数から許可するオリジンを決定
 * - Better Auth 経由のクロスオリジン通信で `credentials: include` を扱えるようヘッダーを統一
 */
import type { NextRequest } from "next/server";

const sanitizeOrigin = (value?: string | null) => {
  if (!value || value === "null" || value === "undefined") {
    return;
  }

  try {
    // 実際に URL として解釈できる値のみ許可する
    const { origin } = new URL(value);
    return origin;
  } catch (_error) {
    return;
  }
};

const getFallbackOrigin = () => {
  const candidates = [
    process.env.WEB_APP_URL,
    process.env.NEXT_PUBLIC_WEB_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
  ];

  const fallbackOrigin =
    candidates.map(sanitizeOrigin).find((value): value is string => Boolean(value)) ??
    "http://localhost:3000";

  return fallbackOrigin;
};

export const resolveAllowedOrigin = (request?: NextRequest) => {
  const headerOrigin = sanitizeOrigin(request?.headers.get("origin"));
  if (headerOrigin) {
    return headerOrigin;
  }

  return getFallbackOrigin();
};

export const buildCorsHeaders = (request?: NextRequest) => {
  const origin = resolveAllowedOrigin(request);

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  } as const;
};

// EOF
