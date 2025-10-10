import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nextra from "nextra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const withNextra = nextra({
    latex: true,
    search: {
        codeblocks: false,
    },
    // ロケール固有のサイドバー表示設定
    // ロケールグループ化を防ぐため false に設定
    unstable_shouldAddLocaleToLinks: false,
});

export default withNextra({
    reactStrictMode: true,

    // 開発時は静的出力設定を無効化（Turbopack対応）
    ...(process.env.CI && {
        output: "export",
        trailingSlash: true,
        distDir: "out",
        // GitHub PagesではassetPrefixは不要（既にプロジェクトパス内にある）
        assetPrefix: "",
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    }),

    // モノレポでの警告解消（開発時のみ）
    ...(!process.env.CI && {
        outputFileTracingRoot: __dirname,
    }),
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
