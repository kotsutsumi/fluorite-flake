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
    const segments = pathname.split("/").filter(Boolean);

    // basePathがある場合は考慮（GitHub Pagesなど）
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
    let startIndex = 0;

    if (basePath && segments[0] === basePath.replace("/", "")) {
        startIndex = 1;
    }

    const locale = segments[startIndex];
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

    // basePathを考慮したリダイレクトURLを生成
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    let redirectPath;

    if (pathname === "/" || pathname === basePath + "/") {
        // ルートパスの場合
        redirectPath = `${basePath}/${detectedLocale}`;
    } else {
        // その他のパスの場合
        redirectPath = `${basePath}/${detectedLocale}${pathname}`;
    }

    const redirectUrl = new URL(redirectPath, request.url);
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
