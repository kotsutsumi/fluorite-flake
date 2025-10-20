// Vercel CLI の前提条件を検証し、必要であればプロジェクト情報を解決するモジュール。
// CLI のバージョン確認・認証確認・設定ファイル探索を一箇所に集約し、
// 本処理側では失敗時のメッセージ処理だけに集中できるようにしている。
import process from "node:process";
import { resolveProjectConfig } from "./resolve-project-config.js";
import type { RunCommandFn } from "./run-command.js";
import type { ProjectConfig } from "./types.js";

export type EnsurePrerequisitesDependencies = {
  readonly runCommand: RunCommandFn;
};

export async function ensurePrerequisites(
  projectRoot: string,
  environment: NodeJS.ProcessEnv | undefined,
  dependencies: EnsurePrerequisitesDependencies
): Promise<ProjectConfig | null> {
  try {
    await dependencies.runCommand("vercel", ["--version"], {
      cwd: projectRoot,
      env: environment ?? process.env,
    });
  } catch (error) {
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    } else {
      message = String(error);
    }
    throw new Error(
      `vercel command not found or failed. Please install Vercel CLI and ensure it is accessible.\n${message}`
    );
  }

  try {
    await dependencies.runCommand("vercel", ["whoami"], {
      cwd: projectRoot,
      env: environment ?? process.env,
    });
  } catch {
    console.warn("⚠️  You are not logged into Vercel CLI. Run 'vercel login' before retrying.");
    throw new Error("Vercel authentication required");
  }

  return resolveProjectConfig(projectRoot);
}

// EOF
