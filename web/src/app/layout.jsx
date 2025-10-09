/* eslint-env node */
import Script from "next/script";
import { Footer, Layout } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";

import { LocalizedNavbar } from "../components/localized-navbar.jsx";

import "./globals.css";

export const metadata = {
    metadataBase: new URL("https://github.com/kotsutsumi/fluorite-flake"),
    title: {
        template: "%s - Fluorite-Flake",
        default: "Fluorite-Flake - 次世代のフルスタック開発ツール",
    },
    description:
        "Fluorite-Flake: 次世代のフルスタック開発ツール - TypeScript優先のプロジェクトスキャフォールディングツール",
    applicationName: "Fluorite-Flake",
    generator: "Next.js",
    keywords: [
        "Fluorite-Flake",
        "CLI",
        "プロジェクトジェネレータ",
        "TypeScript",
        "Next.js",
        "Expo",
        "Tauri",
        "フルスタック",
        "開発ツール",
        "スキャフォールディング",
    ],
    authors: [
        {
            name: "Fluorite-Flake Team",
            url: "https://github.com/kotsutsumi/fluorite-flake",
        },
    ],
    creator: "Fluorite-Flake Team",
    publisher: "Fluorite-Flake",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "ja_JP",
        alternateLocale: ["en_US"],
        url: "https://github.com/kotsutsumi/fluorite-flake",
        siteName: "Fluorite-Flake",
        title: "Fluorite-Flake - 次世代のフルスタック開発ツール",
        description: "TypeScript優先のプロジェクトスキャフォールディングツール。Next.js、Expo、Tauriに対応。",
        images: [
            {
                url: "/fluorite-flake-logo.png",
                width: 1200,
                height: 630,
                alt: "Fluorite-Flake Logo",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "https://github.com/kotsutsumi/fluorite-flake",
        creator: "@fluorite_flake",
        title: "Fluorite-Flake - 次世代のフルスタック開発ツール",
        description: "TypeScript優先のプロジェクトスキャフォールディングツール",
        images: ["/fluorite-flake-logo.png"],
    },
    appleWebApp: {
        title: "Fluorite-Flake",
        statusBarStyle: "default",
        capable: true,
    },
    manifest: "/manifest.json",
    other: {
        "msapplication-TileImage": "/fluorite-flake-logo.png",
        "msapplication-TileColor": "#fff",
        "theme-color": "#000000",
    },
};

export default async function RootLayout({ children }) {
    const pageMap = await getPageMap();
    return (
        <html lang="ja" dir="ltr" suppressHydrationWarning>
            <Head faviconGlyph="✦" />
            <body className="bg-background text-foreground">
                {/* biome-ignore lint/correctness/useUniqueElementIds: レイアウト内で一度のみ使用する初期化スクリプト */}
                <Script id="theme-init" strategy="beforeInteractive">
                    {`
                        try {
                            if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                document.documentElement.classList.add('dark');
                            } else {
                                document.documentElement.classList.remove('dark');
                            }
                        } catch (_) {}
                    `}
                </Script>
                <Layout
                    banner={<Banner storageKey="fluorite-flake-docs">Fluorite-Flake Documentation</Banner>}
                    navbar={<LocalizedNavbar />}
                    footer={<Footer>MIT {new Date().getFullYear()} © Fluorite-Flake.</Footer>}
                    editLink="GitHubでこのページを編集"
                    docsRepositoryBase="https://github.com/kotsutsumi/fluorite-flake/blob/main/web/src/content"
                    sidebar={{
                        defaultMenuCollapseLevel: 1,
                        toggleButton: true,
                    }}
                    pageMap={pageMap}
                >
                    <div className="min-h-screen">{children}</div>
                </Layout>
            </body>
        </html>
    );
}
