// Next.js App Routerのルートレイアウトコンポーネント
// アプリケーション全体のHTML構造とメタデータを定義

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

// Google FontsからInterフォントを読み込み（ラテン文字セット）
const inter = Inter({ subsets: ["latin"] });

// ページのメタデータを定義（SEOとブラウザ表示用）
export const metadata: Metadata = {
  title: "Fluorite Flake",
  description: "Fluorite Flake - A Next.js Fullstack Admin Template",
  icons: {
    icon: "/favicon.ico",
  },
};

// ルートレイアウトコンポーネント
// アプリケーション全体で共通のHTML構造を提供
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Providersコンポーネントで認証、テーマ、その他のコンテキストを提供 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// EOF
