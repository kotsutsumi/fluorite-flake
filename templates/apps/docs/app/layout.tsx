/**
 * ドキュメントサイト全体のレイアウトとメタデータを定義するルートレイアウト。
 * - Nextra テーマの Banner / Navbar / Footer を組み合わせて UI を構成
 * - プロジェクト固有のローカルフォント (Geist) を登録し、CSS 変数として注入
 * - docsRepositoryBase を設定してページから GitHub の編集画面へ遷移できるようにする
 */
import type { ReactNode } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
});

const PROJECT_REPO = "https://github.com/kotsutsumi/fluorite-flake";

export const metadata: Metadata = {
  title: {
    default: "Fluorite Flake Docs",
    template: "%s | Fluorite Flake Docs",
  },
  description: "Documentation for the Fluorite Flake Turborepo workspaces.",
  icons: {
    icon: "/favicon.ico",
  },
};

const banner = (
  <Banner storageKey="docs-setup-banner">
    Built with the Nextra docs theme. Explore the sidebar to get started.
  </Banner>
);

const navbar = (
  <Navbar
    logo={<span className="font-medium">Fluorite Flake Docs</span>}
    projectLink={PROJECT_REPO}
  />
);

const footer = <Footer>MIT {new Date().getFullYear()} © Fluorite Flake.</Footer>;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap();

  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <meta content="#ffffff" name="theme-color" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {/* Nextra の Layout コンポーネントにバナー / ナビゲーション / フッターを渡して全体構造を定義 */}
        <Layout
          banner={banner}
          docsRepositoryBase={`${PROJECT_REPO}/tree/main/apps/docs`}
          footer={footer}
          navbar={navbar}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}

// EOF
