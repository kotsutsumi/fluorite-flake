/* c8 ignore start */
/**
 * データベースシード実行ユーティリティ。
 *
 * このファイルは統合テストでテストすべきシード実行ユーティリティのため、
 * ユニットテストのカバレッジ対象から除外しています。
 */
import type { DbCloudRunnerDeps, EnvironmentCredentials } from "./types.js";

const SEED_COMMAND = ["--filter", "backend", "exec", "tsx", "prisma/seed.ts"] as const;

export async function runSeed(
  deps: DbCloudRunnerDeps,
  credentials: EnvironmentCredentials
): Promise<void> {
  await deps.runCommand("pnpm", SEED_COMMAND, {
    cwd: deps.projectRoot,
    env: {
      ...deps.env,
      DATABASE_PROVIDER: "turso",
      DATABASE_URL: credentials.databaseUrl,
      DIRECT_DATABASE_URL: credentials.databaseUrl,
      PRISMA_DATABASE_URL: credentials.databaseUrl,
      TURSO_DATABASE_URL: credentials.databaseUrl,
      TURSO_AUTH_TOKEN: credentials.authToken,
      TURSO_DATABASE_NAME: credentials.databaseName,
    },
  });
}
/* c8 ignore stop */

// EOF
