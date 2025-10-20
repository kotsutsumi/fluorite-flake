#!/usr/bin/env tsx
/**
 * Turso Cloud のセットアップとメンテナンスを自動化する CLI。
 * apps/backend のためのデータベース作成・マイグレーション・シードを統一的に扱う。
 */
import process from "node:process";

import { parseDbCloudArgs } from "./libs/db-cloud/cli-parser.js";
import { createDefaultRunnerDeps } from "./libs/db-cloud/dependencies.js";
import { createDbCloudRunner } from "./libs/db-cloud/runner.js";

export async function handleDbCloud(argv: readonly string[]): Promise<void> {
  const parsed = parseDbCloudArgs(argv);
  const runner = createDbCloudRunner(createDefaultRunnerDeps());
  await runner(parsed);
}

if (!process.env.VITEST) {
  handleDbCloud(process.argv).catch((error) => {
    console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

// EOF
