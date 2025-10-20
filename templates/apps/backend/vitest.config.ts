/**
 * バックエンドワークスペース (apps/backend) の Vitest 設定。
 * - App Router と共有コンポーネントをテストできるよう happy-dom を利用
 * - tests配下のユニットテストを対象にし、E2E テストディレクトリは除外
 * - カバレッジ閾値を 80% に設定し、主要レイヤー (app/components/lib) を監視
 */

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    // モノレポで同時実行する際に識別しやすいよう name を指定
    name: "backend",
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: [
        "app/api/auth/forget-password/route.ts",
        "app/api/auth/reset-password/route.ts",
        "middleware.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/node_modules/**",
        "**/tests/**",
        "app/layout.tsx",
        "app/**/page.tsx",
        "app/**/layout.tsx",
        "app/**/components/**",
        "app/**/providers.tsx",
        "app/api/graphql/**",
        "components/**/*.{ts,tsx}",
        "lib/db.ts",
        "lib/access-logger.ts",
        "lib/graphql/**",
        "lib/storage*.ts",
        "lib/**/integration.ts",
        "lib/**/store.ts",
        "lib/**/test-data.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "tests/e2e"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
  resolve: {
    alias: {
      // バックエンドアプリから共有 UI コンポーネントやルート相対インポートを利用できるようにする
      "@": path.resolve(__dirname, "./"),
      "@repo/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});

// EOF
