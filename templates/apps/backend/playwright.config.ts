/**
 * バックエンドアプリ (apps/backend) の E2E テスト設定。
 * - API / ダッシュボード両方の UI を対象にクロスブラウザ＆モバイルビューを検証
 * - CI では worker を 1 に固定し、flaky 対策としてリトライを有効化
 * - 失敗テスト時にトレース・スクリーンショット・動画を保存
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * 設定オプションの詳細は https://playwright.dev/docs/test-configuration を参照。
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env.test");

const LINE_BREAK_REGEX = /\r?\n/;
const ENV_LINE_REGEX = /^\s*([A-Z0-9_.-]+)\s*=\s*(.*)\s*$/i;
const QUOTE_REGEX = /^['"]|['"]$/g;

const parseEnvFile = (filePath: string): Record<string, string> => {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};
  for (const line of content.split(LINE_BREAK_REGEX)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const match = line.match(ENV_LINE_REGEX);
    if (!match) {
      continue;
    }
    const [, key, raw] = match;
    if (!(key && raw)) {
      continue;
    }
    const value = raw.replace(QUOTE_REGEX, "");
    entries[key] = value;
  }
  return entries;
};

const testEnv = parseEnvFile(envPath);
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  /* テストファイルを並列実行する */
  fullyParallel: false,
  /* test.only が残っていた場合に CI でビルドを失敗させる */
  forbidOnly: !!process.env.CI,
  /* CI 環境のみリトライを有効にする */
  retries: process.env.CI ? 2 : 0,
  /* CI では並列テストを無効にする */
  workers: 1,
  /* 使用するレポーター。詳細は https://playwright.dev/docs/test-reporters を参照 */
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],
  /* 以降の全プロジェクトで共有する設定。https://playwright.dev/docs/api/class-testoptions を参照 */
  use: {
    /* `await page.goto('/')` のような操作で使う基底 URL */
    baseURL,
    /* リトライ時にトレースを収集する。https://playwright.dev/docs/trace-viewer を参照 */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  /* 主要ブラウザ向けのプロジェクト設定 */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* モバイルのビューポートでもテストする */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  /* テスト開始前にローカル開発サーバーを起動する */
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    env: { ...process.env, ...testEnv } as Record<string, string>,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});

// EOF
