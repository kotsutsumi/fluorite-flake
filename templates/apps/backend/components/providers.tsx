/**
 * アプリケーション全体のプロバイダー設定
 * Jotai・ThemeProvider・LoadingMaskの統合
 */
"use client";

import { Provider as JotaiProvider } from "jotai";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { LoadingMask } from "@/components/loading/loading-mask";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
        {...({
          children: (
            <>
              {children}
              {/* グローバルに読み込み中オーバーレイを挿入し、任意の場所から制御できるようにする */}
              <LoadingMask />
            </>
          ),
          // biome-ignore lint/suspicious/noExplicitAny: next-themes 0.4.6の型定義にはchildrenプロパティが正しく含まれていないため
        } as any)}
      />
    </JotaiProvider>
  );
}

// ファイル終端

// EOF
