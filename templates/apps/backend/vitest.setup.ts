/**
 * バックエンドアプリ (apps/backend) の単体テストを実行する際のセットアップ。
 * - Next.js 固有の `headers` / `navigation` API をモック化
 * - Better Auth が利用する環境変数をテスト用にスタブ
 * - テストが DOM を利用するため `@testing-library/jest-dom` を登録
 */
import "@testing-library/jest-dom/vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// Next.js のモジュールをモック化する
vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
  cookies: vi.fn(() => Promise.resolve({ get: vi.fn(), set: vi.fn() })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// .env.test を読み込み、テスト専用の環境変数を整える
const envPath = resolve(process.cwd(), ".env.test");

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
} else if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) {
      continue;
    }
    const match = line.match(/^\s*([A-Z0-9_.-]+)\s*=\s*(.*)\s*$/i);
    if (!match) {
      continue;
    }
    const [, key, raw] = match;
    if (!key || raw === undefined) {
      continue;
    }
    const value = raw.replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const ensureEnv = (key: string, fallback: string) => {
  const value = process.env[key] ?? fallback;
  vi.stubEnv(key, value);
};

// Better Auth / Prisma などの依存ライブラリが期待する値をテスト用に固定する
ensureEnv("NODE_ENV", "test");
ensureEnv("NEXT_PUBLIC_ENV", "test");
ensureEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");
ensureEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
ensureEnv("DATABASE_PROVIDER", "turso");
ensureEnv("DATABASE_URL", "file:./prisma/test.db");
ensureEnv("PRISMA_DATABASE_URL", "file:./prisma/test.db");
ensureEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing");
ensureEnv("BETTER_AUTH_URL", "http://localhost:3001");
ensureEnv("AUTH_REQUIRE_ADMIN_APPROVAL", "true");
ensureEnv("TURSO_AUTH_TOKEN", "");

// テストの初期化と後片付けを定義する
beforeAll(() => {
  // グローバルなテスト初期化処理
});

afterEach(() => {
  // 各テスト後にモックを初期化する
  vi.clearAllMocks();
});

afterAll(() => {
  // グローバルなテスト終了処理
});

// EOF
