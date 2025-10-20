/**
 * Web アプリ (apps/web) の Vitest 設定。
 * - happy-dom を利用して App Router のテストをブラウザライクに実行
 * - tests ディレクトリ配下のユニットテストのみを対象とし、E2E を除外
 * - カバレッジ閾値や共通エイリアスを定義
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "web",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/tests/**",
        "app/layout.tsx",
        "app/*/page.tsx", // Page components without server logic
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "tests/e2e"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});

// EOF
