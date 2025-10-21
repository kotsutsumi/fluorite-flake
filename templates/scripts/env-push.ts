#!/usr/bin/env tsx
// Vercel 環境変数同期 CLI のエントリーポイント。
// ここでは最低限の引数解析と依存関係の組み立てだけを担い、
// 本質的な処理は libs 配下のテスト済みモジュールに移譲する。
import process from "node:process";

import {
  parseEnvPushArgs,
  type RunCommandFn,
  runCommand,
  runEnvPush,
} from "./libs/env-push/index.js";

const SCRIPT_PATH = "scripts/env-push.ts";

function createDependencies(): { readonly runCommand: RunCommandFn } {
  return {
    runCommand,
  };
}

export async function handleEnvPush(argv: readonly string[]): Promise<void> {
  try {
    const parsed = parseEnvPushArgs(argv, {
      cwd: process.cwd(),
      scriptPath: SCRIPT_PATH,
    });

    await runEnvPush(
      {
        selection: parsed.selection,
        projectRoot: parsed.projectRoot,
        cwd: process.cwd(),
        environment: process.env,
      },
      createDependencies()
    );
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

// ESモジュールでメインモジュールかどうかを判定
// import.meta.url === `file://${process.argv[1]}` は、
// スクリプトが直接実行された場合のみtrueになる
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1]);

if (!process.env.VITEST && isMainModule) {
  handleEnvPush(process.argv).catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exitCode = 1;
  });
}

// EOF
