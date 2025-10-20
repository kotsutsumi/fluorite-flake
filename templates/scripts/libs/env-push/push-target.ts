// 指定されたターゲット環境に環境変数を適用するロジックをまとめたモジュール。
// ファイル読み込み・値の正規化・vercel コマンド呼び出しまでを一連の処理として扱い、
// 上位レイヤーがターゲットの列挙とエラーハンドリングに専念できるようにしている。
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { relative, resolve } from "node:path";
import process from "node:process";
import { readEnvMap } from "./read-env-map.js";
import type { RunCommandFn } from "./run-command.js";
import type { ProjectConfig, TargetConfig, TargetName } from "./types.js";
import { TARGETS } from "./types.js";

type FileExists = (path: string) => Promise<boolean>;

export type PushTargetOptions = {
  readonly cwd: string;
  readonly projectRoot: string;
  readonly projectConfig: ProjectConfig | null;
};

export type PushTargetDependencies = {
  readonly runCommand: RunCommandFn;
  readonly fileExists?: FileExists;
};

async function defaultFileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function pushTarget(
  targetName: TargetName,
  options: PushTargetOptions,
  dependencies: PushTargetDependencies
): Promise<void> {
  const config = TARGETS[targetName];
  const envFilePath = resolve(options.cwd, config.envFile);
  const fileExists = dependencies.fileExists ?? defaultFileExists;

  if (!(await fileExists(envFilePath))) {
    throw new Error(`${config.envFile} not found in ${options.cwd}`);
  }

  const relativePath = relative(options.cwd, envFilePath) || config.envFile;
  console.log(`📄 Loading ${relativePath}`);
  const variables = await readEnvMap(envFilePath);

  if (variables.size === 0) {
    console.warn(`⚠️  ${config.envFile} does not contain any variables. Skipping.`);
    return;
  }

  console.log(`🚀 Pushing ${variables.size} variables to ${targetName.toUpperCase()}`);

  let hasGitBranchError = false;

  for (const [key, value] of variables.entries()) {
    try {
      await upsertVariable({
        key,
        value,
        targetName,
        options,
        runCommand: dependencies.runCommand,
        config,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Git ブランチが指定されていて、エラーメッセージにブランチ名が含まれている場合は
      // ブランチが存在しないエラーと判断して警告を出してスキップ
      if (
        config.gitBranch &&
        errorMessage.includes("exited with code") &&
        errorMessage.includes(config.gitBranch)
      ) {
        if (!hasGitBranchError) {
          console.warn(
            `⚠️  Git branch "${config.gitBranch}" not found. Skipping ${targetName} environment.`
          );
          hasGitBranchError = true;
        }
        return;
      }

      // その他のエラーは再スロー
      throw error;
    }
  }

  console.log(`✅ Completed push for ${targetName}`);
}

type UpsertContext = {
  readonly key: string;
  readonly value: string;
  readonly targetName: TargetName;
  readonly options: PushTargetOptions;
  readonly runCommand: RunCommandFn;
  readonly config: TargetConfig;
};

async function upsertVariable(context: UpsertContext): Promise<void> {
  const args = ["env", "add", context.key, context.config.deploymentTarget];
  if (context.config.gitBranch) {
    args.push(context.config.gitBranch);
  }
  args.push("--force");

  const env = {
    ...process.env,
    ...(context.options.projectConfig
      ? {
          VERCEL_ORG_ID: context.options.projectConfig.orgId,
          VERCEL_PROJECT_ID: context.options.projectConfig.projectId,
        }
      : {}),
  } as NodeJS.ProcessEnv;

  await context.runCommand("vercel", args, {
    cwd: context.options.projectRoot,
    env,
    input: context.value,
  });
}

// EOF
