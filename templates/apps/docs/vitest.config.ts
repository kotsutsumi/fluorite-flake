/**
 * ドキュメントアプリ (apps/docs) の Vitest 設定。
 * - happy-dom を使って Next.js App Router のテストをブラウザライクに実行
 * - tests配下のユニットテストを対象にし、E2E ディレクトリは除外
 * - カバレッジ閾値や UI パッケージのエイリアスを共通化
 */

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // 複数ワークスペースで実行した際に識別できるよう name を付与
    name: "docs",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "pages/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/tests/**",
        "app/layout.tsx",
        "**/_meta.ts", // Nextra metadata files
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "tests/e2e"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      // ドキュメントアプリでも `@/...` や共有 UI コンポーネントを参照できるようにする
      "@": path.resolve(__dirname, "./"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});

// EOF
