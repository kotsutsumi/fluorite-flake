/* c8 ignore start */
/**
 * DB Cloud CLI の中核ロジック。依存関係を受け取り、サブコマンドごとのワークフローを実装する。
 *
 * このファイルは複雑なCLIオーケストレーションロジックを含み、統合テストでテストすべきため、
 * ユニットテストのカバレッジ対象から除外しています。
 */
import { assertCommandAvailable } from "../env-tools/assert-command-available.js";

import { resolveBaseDatabaseName } from "./base-name.js";
import { TURSO_INSTALL_HINTS } from "./constants.js";
import { createDefaultEnvDeps, promptWithReadline } from "./dependencies.js";
import { inferDatabaseNameFromUrl, parseEnvContent, saveCredentialsToEnv } from "./env-manager.js";
import { generateFullSchemaSQL } from "./schema-generator.js";
import { runSeed } from "./seed-runner.js";
import {
  collectExistingDatabases,
  createTursoDatabase,
  destroyTursoDatabase,
  executeSql,
  formatTokenPreview,
  getTursoDatabaseDetails,
  issueTursoToken,
} from "./turso-client.js";
import type {
  DbCloudRunnerDeps,
  DbEnvironment,
  EnvironmentCredentials,
  ParsedCli,
  TursoClientDeps,
} from "./types.js";
import { DB_ENVIRONMENTS } from "./types.js";

export function createDbCloudRunner(deps: DbCloudRunnerDeps) {
  const envDeps = createDefaultEnvDeps(deps.logger);
  const clientDeps: TursoClientDeps = {
    runCommand: deps.runCommand,
    runCommandCapture: deps.runCommandCapture,
    logger: deps.logger,
  };

  async function loadCredentials(env: DbEnvironment): Promise<EnvironmentCredentials> {
    const envFilePath = `${deps.backendRoot}/.env.${env}`;
    const content = await envDeps.readFile(envFilePath, "utf8").catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return "";
      }
      throw error;
    });
    const parsed = parseEnvContent(content);
    const databaseUrl =
      parsed.get("DATABASE_URL") ??
      parsed.get("PRISMA_DATABASE_URL") ??
      parsed.get("DIRECT_DATABASE_URL");
    if (!databaseUrl) {
      throw new Error(
        `apps/backend/.env.${env} に DATABASE_URL がありません。まずは "pnpm db:cloud:create" を実行してください。`
      );
    }
    const authToken = parsed.get("TURSO_AUTH_TOKEN");
    if (!authToken) {
      throw new Error(
        `apps/backend/.env.${env} に Turso の認証トークンがありません。"pnpm db:cloud:create" で再生成してください。`
      );
    }
    const databaseName =
      parsed.get("TURSO_DATABASE_NAME") ?? inferDatabaseNameFromUrl(databaseUrl) ?? "unknown";
    return {
      env,
      databaseUrl,
      authToken,
      databaseName,
    };
  }

  async function recreateAndConfigureEnvironment(
    env: DbEnvironment,
    dbName: string,
    desiredRegion?: string
  ): Promise<EnvironmentCredentials> {
    let region = desiredRegion;
    let existingDetails: Awaited<ReturnType<typeof getTursoDatabaseDetails>> | undefined;
    try {
      existingDetails = await getTursoDatabaseDetails(clientDeps, dbName);
      region ??= existingDetails.locations?.[0];
    } catch {
      // DB が存在しない場合はそのまま続行
    }

    if (existingDetails) {
      deps.logger.info(`♻️  ${dbName} を再作成します`);
      try {
        await destroyTursoDatabase(clientDeps, dbName);
      } catch (error) {
        deps.logger.warn(
          `⚠️ ${dbName} の削除に失敗しました: ${error instanceof Error ? error.message : error}`
        );
      }
    } else {
      deps.logger.info(`🚀 データベースを作成しています: ${dbName}`);
    }

    await createTursoDatabase(clientDeps, dbName, region);
    const details = await getTursoDatabaseDetails(clientDeps, dbName);
    const token = await issueTursoToken(clientDeps, dbName);

    await saveCredentialsToEnv(envDeps, deps.backendRoot, {
      env,
      databaseUrl: details.url,
      authToken: token,
      databaseName: dbName,
    });

    deps.logger.info(
      [
        `✅ ${dbName} の接続情報を更新しました。`,
        `    URL: ${details.url}`,
        `    Token: ${formatTokenPreview(token)}`,
      ].join("\n")
    );

    return loadCredentials(env);
  }

  async function applySchema(dbName: string, sql: string): Promise<void> {
    await executeSql(clientDeps, dbName, sql);
  }

  async function handleCreate(args: ParsedCli): Promise<void> {
    await assertCommandAvailable("turso", TURSO_INSTALL_HINTS);

    const existingNames = await collectExistingDatabases(clientDeps);
    const baseName = await resolveBaseDatabaseName({
      initialName: args.name,
      autoApprove: args.yes,
      existingNames,
      logger: deps.logger,
      prompt: promptWithReadline,
    });

    const schemaSql = await generateFullSchemaSQL(deps);

    for (const env of DB_ENVIRONMENTS) {
      const dbName = `${baseName}-${env}`;
      const credentials = await recreateAndConfigureEnvironment(env, dbName, args.primaryRegion);
      await applySchema(dbName, schemaSql);
      await runSeed(deps, credentials);
    }

    deps.logger.info("🎉 Turso 上の各データベースが利用可能になりました。");
  }

  async function handleApply(
    target: ParsedCli["environment"],
    { shouldSeed, destroyFirst }: { shouldSeed: boolean; destroyFirst: boolean }
  ): Promise<void> {
    const schemaSql = await generateFullSchemaSQL(deps);
    const targets = target === "all" ? DB_ENVIRONMENTS : [target];

    for (const env of targets) {
      const existing = await loadCredentials(env);
      const dbName = existing.databaseName;
      let regionDetails: Awaited<ReturnType<typeof getTursoDatabaseDetails>> | undefined;
      if (destroyFirst) {
        try {
          regionDetails = await getTursoDatabaseDetails(clientDeps, dbName);
        } catch {
          regionDetails = undefined;
        }
      }

      const credentials = destroyFirst
        ? await recreateAndConfigureEnvironment(env, dbName, regionDetails?.locations?.[0])
        : existing;

      await applySchema(dbName, schemaSql);

      if (shouldSeed) {
        await runSeed(deps, credentials);
      }
    }
  }

  async function handleSeed(target: ParsedCli["environment"]): Promise<void> {
    const targets = target === "all" ? DB_ENVIRONMENTS : [target];
    for (const env of targets) {
      const credentials = await loadCredentials(env);
      await runSeed(deps, credentials);
    }
  }

  return async function run(parsed: ParsedCli): Promise<void> {
    switch (parsed.command) {
      case "create":
        await handleCreate(parsed);
        break;
      case "migrate":
        await handleApply(parsed.environment, { shouldSeed: false, destroyFirst: true });
        break;
      case "push":
        await handleApply(parsed.environment, { shouldSeed: false, destroyFirst: true });
        break;
      case "seed":
        await handleSeed(parsed.environment);
        break;
      case "reset":
        await handleApply(parsed.environment, { shouldSeed: true, destroyFirst: true });
        break;
      default:
        throw new Error(`未対応のコマンドです: ${parsed.command}`);
    }
  };
}
/* c8 ignore stop */

// EOF
