import { NextResponse } from "next/server";

// サポートされるロケール一覧
const locales = ["en-US", "ja-JP"];
const defaultLocale = "ja-JP";

/**
 * パス名からロケールを取得する
 * @param {string} pathname - URL のパス名
 * @returns {string|null} - 見つかったロケール、またはnull
 */
function getLocaleFromPathname(pathname) {
    const segments = pathname.split("/");
    const locale = segments[1];
    return locales.includes(locale) ? locale : null;
}

/**
 * Accept-Languageヘッダーから優先言語を取得する
 * @param {string} acceptLanguage - Accept-Languageヘッダーの値
 * @returns {string} - 検出されたロケール
 */
function getLocaleFromHeader(acceptLanguage) {
    if (!acceptLanguage) return defaultLocale;

    // 日本語が含まれている場合は ja-JP を返す
    if (acceptLanguage.includes("ja")) {
        return "ja-JP";
    }

    // 英語が含まれている場合は en-US を返す
    if (acceptLanguage.includes("en")) {
        return "en-US";
    }

    // デフォルトは ja-JP
    return defaultLocale;
}

/**
 * ミドルウェア関数
 * i18nルーティングと言語検出を処理する
 */
export function middleware(request) {
    const { pathname } = request.nextUrl;

    // 静的ファイルやAPIルートはスキップ
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/fluorite-flake-logo") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // パス名からロケールを取得
    const pathnameLocale = getLocaleFromPathname(pathname);

    // ロケールが既にパスに含まれている場合はそのまま進める
    if (pathnameLocale) {
        return NextResponse.next();
    }

    // ロケールが含まれていない場合、言語を検出してリダイレクト
    const acceptLanguage = request.headers.get("accept-language");
    const detectedLocale = getLocaleFromHeader(acceptLanguage);

    // 検出された言語でリダイレクト
    const redirectUrl = new URL(`/${detectedLocale}${pathname}`, request.url);
    return NextResponse.redirect(redirectUrl);
}

/**
 * ミドルウェアの設定
 * 特定のパスでのみミドルウェアを実行する
 */
export const config = {
    matcher: [
        // 静的ファイルとAPIルートを除外
        "/((?!_next/static|_next/image|favicon.ico|fluorite-flake-logo.png|api/).*)",
    ],
};

// EOF