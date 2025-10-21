#!/usr/bin/env tsx
/**
 * Vercel プロジェクトリンクと環境変数設定を自動化する CLI
 * apps/ 配下の各アプリを Vercel プロジェクトにリンクし、
 * .env.production / .env.staging / .env.preview を自動更新する
 */
import process from "node:process";

import { createDefaultDeps } from "./libs/vercel-link/dependencies.js";
import { runVercelLink } from "./libs/vercel-link/runner.js";

export async function handleVercelLink(): Promise<void> {
  try {
    const deps = createDefaultDeps();
    await runVercelLink(deps);
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

// ESモジュールでメインモジュールかどうかを判定
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1]);

if (!process.env.VITEST && isMainModule) {
  handleVercelLink().catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exitCode = 1;
  });
}

// EOF
