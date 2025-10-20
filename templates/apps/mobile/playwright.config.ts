/**
 * Expo (web) 向けの Playwright 設定。
 * - backend (Next.js) を同時に起動して GraphQL 認証を利用
 * - Expo Router の Web サーバーをポート 4002 で起動
 * - .env.test を読み込み、必要な環境変数を設定
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const envPath = path.resolve(__dirname, ".env.test");
const LINE_BREAK_REGEX = /\r?\n/;
const ENV_LINE_REGEX = /^\s*([A-Z0-9_.-]+)\s*=\s*(.*)\s*$/i;
const QUOTE_REGEX = /^['"]|['"]$/g;

function parseEnvFile(filePath: string): Record<string, string> {
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
}

const testEnv = parseEnvFile(envPath);
for (const [key, value] of Object.entries(testEnv)) {
  process.env[key] = value;
}

const backendUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";
const baseURL = process.env.EXPO_E2E_BASE_URL ?? "http://localhost:4002";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter backend dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        ...process.env,
        NODE_ENV: "development",
        NEXT_PUBLIC_CORS_ORIGIN: baseURL,
        DATABASE_URL: "file:./prisma/test.db",
        PRISMA_DATABASE_URL: "file:./prisma/test.db",
      } as Record<string, string>,
    },
    {
      command:
        "bash -lc 'pnpm --filter mobile build >/dev/null && pnpm --filter mobile exec serve -l 4002 dist --single'",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        ...process.env,
        EXPO_PUBLIC_API_URL: backendUrl,
        EXPO_PUBLIC_API_BASE_URL: backendUrl,
        BROWSER: "none",
        CI: "1",
      } as Record<string, string>,
    },
  ],
});

// EOF
