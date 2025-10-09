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

    // GitHub Pages用の静的出力設定
    output: "export",
    trailingSlash: true,
    distDir: "out",
    assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

    // ワークスペースルート設定（警告解消）
    outputFileTracingRoot: process.cwd(),
    // App Router用のi18n設定は別の方法で実装する必要がある
    // i18n: {
    //     locales: ["en-US", "ja-JP"],
    //     defaultLocale: "en-US",
    //     localeDetection: true,
    // },

    // パフォーマンス最適化設定
    compress: true,
    poweredByHeader: false,

    // 画像最適化設定（静的出力用）
    images: {
        unoptimized: true, // 静的出力では画像最適化を無効
    },

    // 実験的機能（安定性のため一時的に無効化）
    // experimental: {
    //     optimizeCss: true,
    //     optimizePackageImports: ["nextra", "nextra-theme-docs"],
    //     // gzipSize: true,
    //     webVitalsAttribution: ["CLS", "LCP"],
    // },

    // 静的出力モードではrewrites/headersは無効
    // リライト設定とヘッダー設定は実行時環境で処理
});
