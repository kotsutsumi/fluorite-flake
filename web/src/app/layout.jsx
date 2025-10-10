/* eslint-env node */
import Script from "next/script";
import { Head } from "nextra/components";
import "nextra-theme-docs/style.css";

import "./globals.css";

// GitHub Pages用のbasePathを取得するヘルパー関数
function getBasePath() {
    return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

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
                url: `${getBasePath()}/fluorite-flake-logo.png`,
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
        images: [`${getBasePath()}/fluorite-flake-logo.png`],
    },
    appleWebApp: {
        title: "Fluorite-Flake",
        statusBarStyle: "default",
        capable: true,
    },
    manifest: `${getBasePath()}/manifest.json`,
    other: {
        "msapplication-TileImage": `${getBasePath()}/fluorite-flake-logo.png`,
        "msapplication-TileColor": "#fff",
        "theme-color": "#000000",
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="ja" dir="ltr" suppressHydrationWarning>
            <Head faviconGlyph="✦" />
            <body className="bg-background text-foreground">
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
                {children}
            </body>
        </html>
    );
}
