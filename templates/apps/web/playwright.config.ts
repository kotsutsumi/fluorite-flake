/**
 * Web アプリ (apps/web) の Playwright 設定。
 * - /tests/e2e を対象に主要ブラウザで回帰テスト
 * - CI では worker を 1 に固定し、リトライやトレース採取を有効化
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

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

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
  ],
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    env: { ...process.env, ...testEnv } as Record<string, string>,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

// EOF
