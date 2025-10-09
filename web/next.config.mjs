import nextra from "nextra";

const withNextra = nextra({
    latex: true,
    search: {
        codeblocks: false,
    },
    contentDirBasePath: "/docs",
});

export default withNextra({
    reactStrictMode: true,
    // App Router用のi18n設定は別の方法で実装する必要がある
    // i18n: {
    //     locales: ["en-US", "ja-JP"],
    //     defaultLocale: "en-US",
    //     localeDetection: true,
    // },

    // パフォーマンス最適化設定
    compress: true,
    poweredByHeader: false,

    // 画像最適化設定
    images: {
        formats: ["image/webp", "image/avif"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 60 * 60 * 24 * 30, // 30日間
        dangerouslyAllowSVG: false,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // 実験的機能（安定性のため一時的に無効化）
    // experimental: {
    //     optimizeCss: true,
    //     optimizePackageImports: ["nextra", "nextra-theme-docs"],
    //     // gzipSize: true,
    //     webVitalsAttribution: ["CLS", "LCP"],
    // },

    // リライト設定：複数のパスパターンを /docs/get-started.* にリライト
    async rewrites() {
        return [
            // パターン1: /get-started.ja-JP, /get-started.en-US
            {
                source: "/get-started.:locale(ja-JP|en-US)",
                destination: "/docs/get-started.:locale",
            },
            // パターン2: /ja-JP/get-started, /en-US/get-started
            {
                source: "/:locale(ja-JP|en-US)/get-started",
                destination: "/docs/get-started.:locale",
            },
        ];
    },

    // ヘッダー設定（セキュリティ強化）
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
            {
                source: "/manifest.json",
                headers: [
                    {
                        key: "Content-Type",
                        value: "application/manifest+json",
                    },
                    {
                        key: "Cache-Control",
                        value: "public, max-age=86400", // 1日間キャッシュ
                    },
                ],
            },
            // 画像ファイルのキャッシュ設定は Next.js の画像最適化機能で処理
        ];
    },
});
