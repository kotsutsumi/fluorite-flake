#!/usr/bin/env tsx
// Vercel 環境変数 Pull CLI のエントリーポイント。
// CLI では引数解析と依存関係の注入のみを行い、実際の処理は libs 配下に委譲する。
import process from "node:process";

import {
  parseEnvPullArgs,
  pullTarget,
  type RunEnvPullDependencies,
  runEnvPull,
} from "./libs/env-pull/index.js";
import { ensurePrerequisites, runCommand } from "./libs/env-push/index.js";

const SCRIPT_PATH = "scripts/env-pull.ts";

function createDependencies(): RunEnvPullDependencies {
  return {
    runCommand,
    ensurePrerequisites,
    pullTarget,
  };
}

export async function handleEnvPull(argv: readonly string[]): Promise<void> {
  try {
    const parsed = parseEnvPullArgs(argv, {
      cwd: process.cwd(),
      scriptPath: SCRIPT_PATH,
    });

    await runEnvPull(
      {
        projectRoot: parsed.projectRoot,
        cwd: process.cwd(),
        selection: parsed.selection,
        apps: parsed.apps,
        environment: process.env,
      },
      createDependencies()
    );
  } catch (error) {
    console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (!process.env.VITEST) {
  handleEnvPull(process.argv).catch((error) => {
    console.error("❌ Unhandled error:", error);
    process.exitCode = 1;
  });
}

// EOF
