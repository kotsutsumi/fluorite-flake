import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Viteビルドツールの設定ファイルを作成する
 * @param config プロジェクト設定
 */
export async function setupVite(config: ProjectConfig) {
    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Tauri開発に特化したViteオプション
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. viteに\`src-tauri\`の監視を無視するよう指示
      ignored: ['**/src-tauri/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Tauriはes2021をサポート
    target: process.env.TAURI_DEBUG ? 'es2021' : 'chrome100',
    // デバッグビルドではミニファイしない
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // デバッグビルド用のソースマップを生成
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}));
`;

    await fs.writeFile(path.join(config.projectPath, 'vite.config.ts'), viteConfig);
}
