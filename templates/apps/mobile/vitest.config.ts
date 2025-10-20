/**
 * モバイルワークスペースで使用する Vitest の設定。
 * - happy-dom 環境を利用して React Native コンポーネントのテストを高速化
 * - tests ディレクトリ配下の *.test / *.spec をテスト対象として収集
 * - カバレッジレポートや React Native -> Web 向けのエイリアスを一元管理
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // グローバルな expect / describe などを有効にし、ブラウザライクな DOM を提供する
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.expo/**", "**/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "**/*.config.{js,ts}", "**/tests/**", ".expo/", "dist/"],
    },
  },
  resolve: {
    alias: {
      // "@/..." でモバイルアプリルートにアクセスし、React Native のモジュールを Web 実装へ差し替える
      "@": path.resolve(__dirname, "."),
      "react-native$": "react-native-web",
      "react-native/": "react-native-web/",
    },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".web.jsx", ".web.js", ".jsx", ".js"],
  },
  optimizeDeps: {
    // react-native はバンドラに任せるため依存最適化の対象外にする
    exclude: ["react-native"],
  },
});

// EOF
