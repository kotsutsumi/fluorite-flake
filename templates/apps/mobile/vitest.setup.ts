/**
 * モバイル向けテストのための Vitest セットアップを集約する。
 * - JSDOM ベースのテスト環境でも React Native の API を利用できるようグローバルを整備する
 * - expo-router / Expo モジュールをモック化し、画面遷移やセキュアストレージ依存を切り離す
 * - 依存サービスの既定値を定義してテストを安定させる
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import type { PropsWithChildren } from "react";
import { vi } from "vitest";

// .env.test を読み込んでテスト専用の環境値を整える
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

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
process.env.EXPO_PUBLIC_API_URL = apiUrl;

// react-native-web を利用するために最小限の window / document を用意する
const testGlobal = globalThis as typeof globalThis & {
  window?: typeof globalThis;
  document?: Document;
};

if (!testGlobal.window) {
  testGlobal.window = {} as Window & typeof globalThis;
}

if (!testGlobal.document) {
  testGlobal.document = {} as Document;
}

// expo-router をモック化し、push / replace などの履歴操作をテストで検証できるようにする
vi.mock("expo-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useLocalSearchParams: () => ({}),
  Link: ({ children }: PropsWithChildren) => children,
}));

// Expo Secure Store をモック化してストレージ同期をシミュレートする
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

// Expo Constants をモック化して API URL 等の環境値を固定する
vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl,
      },
    },
  },
}));

// EOF
