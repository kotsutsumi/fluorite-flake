/**
 * apps/backend 全体に適用される Next.js ミドルウェア設定。
 * - Server Components から現在のパスを参照できるよう `x-pathname` をヘッダーに追加
 * - API や静的ファイルなど不要なルートにはマッチしないよう `matcher` で除外
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // リクエストヘッダーを複製し、Server Components で利用できるよう x-pathname を付与
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストパスにミドルウェアを適用する:
     * - api (API ルート)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

// EOF
