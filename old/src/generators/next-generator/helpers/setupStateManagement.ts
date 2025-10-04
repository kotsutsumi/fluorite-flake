/**
 * Jotaiを使用した状態管理システムをセットアップするヘルパー関数
 * プロジェクトの状態管理とプロバイダーを設定する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Jotaiを使用した状態管理システムをセットアップする
 * @param config プロジェクト設定
 */
export async function setupStateManagement(config: ProjectConfig): Promise<void> {
    // Jotaiストアの定義
    const storeContent = `import { atom } from 'jotai';

export const countAtom = atom(0);
export const themeAtom = atom<'light' | 'dark'>('light');
`;

    await fs.writeFile(path.join(config.projectPath, 'src/lib/store.ts'), storeContent);

    // プロバイダーコンポーネント
    const providersContent = `'use client';

import type { ReactNode } from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <JotaiProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </JotaiProvider>
  );
}
`;

    await fs.writeFile(
        path.join(config.projectPath, 'src/components/providers.tsx'),
        providersContent
    );
}
