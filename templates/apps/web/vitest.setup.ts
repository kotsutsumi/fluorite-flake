// vitest.setup のロジックをまとめる。
import "@testing-library/jest-dom/vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// .env.test を読み込んでテスト用の環境値を整える
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

ensureEnv("NODE_ENV", "test");
ensureEnv("NEXT_PUBLIC_ENV", "test");
ensureEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
ensureEnv("NEXT_PUBLIC_API_URL", "http://localhost:3001");
ensureEnv("BETTER_AUTH_URL", "http://localhost:3001");
ensureEnv("BETTER_AUTH_SECRET", "test-secret-key-minimum-32-characters-long-for-security");
ensureEnv("AUTH_REQUIRE_ADMIN_APPROVAL", "false");

// Next.js の Router モジュールをモック化する
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

// テスト全体の初期化と後片付けを定義する
beforeAll(() => {
  // グローバルなテスト初期化処理
});

afterEach(() => {
  // 各テスト後にモックをリセット
  vi.clearAllMocks();
});

afterAll(() => {
  // グローバルなテスト終了処理
});

// EOF
