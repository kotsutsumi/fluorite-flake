/* c8 ignore start */
/**
 * Prisma コマンドの実行をラップし、環境変数の注入やログ出力を統一するモジュール。
 *
 * このファイルは統合テストでテストすべきPrisma CLI実行ユーティリティのため、
 * ユニットテストのカバレッジ対象から除外しています。
 */
import type { EnvironmentCredentials, PrismaRunnerDeps } from "./types.js";

const TURSO_SCHEMA_PATH = "prisma/schema.turso.prisma";

function buildPrismaEnv(
  credentials: EnvironmentCredentials,
  baseEnv: NodeJS.ProcessEnv
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    DATABASE_PROVIDER: "turso",
    DATABASE_URL: credentials.databaseUrl,
    DIRECT_DATABASE_URL: credentials.databaseUrl,
    PRISMA_DATABASE_URL: credentials.databaseUrl,
    TURSO_DATABASE_URL: credentials.databaseUrl,
    TURSO_AUTH_TOKEN: credentials.authToken,
    TURSO_DATABASE_NAME: credentials.databaseName,
  };
}

async function runPrisma(
  deps: PrismaRunnerDeps,
  credentials: EnvironmentCredentials,
  prismaArgs: readonly string[],
  baseEnv: NodeJS.ProcessEnv
): Promise<void> {
  const args = [
    "--filter",
    "backend",
    "exec",
    "prisma",
    ...prismaArgs,
    "--schema",
    TURSO_SCHEMA_PATH,
  ];
  await deps.runCommand("pnpm", args, {
    cwd: deps.projectRoot,
    env: buildPrismaEnv(credentials, baseEnv),
  });
}

export async function runMigrate(
  deps: PrismaRunnerDeps,
  credentials: EnvironmentCredentials,
  baseEnv: NodeJS.ProcessEnv
): Promise<void> {
  deps.logger.info(`📦 prisma migrate deploy を実行中: ${credentials.env}`);
  await runPrisma(deps, credentials, ["migrate", "deploy"], baseEnv);
}

export async function runPush(
  deps: PrismaRunnerDeps,
  credentials: EnvironmentCredentials,
  baseEnv: NodeJS.ProcessEnv
): Promise<void> {
  deps.logger.info(`📤 prisma db push を実行中: ${credentials.env}`);
  await runPrisma(deps, credentials, ["db", "push"], baseEnv);
}

export async function runSeed(
  deps: PrismaRunnerDeps,
  credentials: EnvironmentCredentials,
  baseEnv: NodeJS.ProcessEnv
): Promise<void> {
  deps.logger.info(`🌱 prisma db seed を実行中: ${credentials.env}`);
  await runPrisma(deps, credentials, ["db", "seed"], baseEnv);
}

export async function runReset(
  deps: PrismaRunnerDeps,
  credentials: EnvironmentCredentials,
  baseEnv: NodeJS.ProcessEnv
): Promise<void> {
  deps.logger.info(`♻️  データベースを初期化しています: ${credentials.env}`);
  await runPrisma(deps, credentials, ["db", "push", "--force-reset"], baseEnv);
  await runSeed(deps, credentials, baseEnv);
}
/* c8 ignore stop */

// EOF
