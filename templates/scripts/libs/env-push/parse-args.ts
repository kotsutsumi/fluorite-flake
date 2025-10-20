// CLI 引数を解釈し、ターゲット環境とプロジェクトルートを決定する責務を担うモジュール。
// スクリプトから分離することで、テストを通じてサニティチェックやエラーメッセージを
// 維持しやすくしつつ、入出力仕様をドキュメントとして残している。
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { TargetSelection } from "./types.js";
import { printEnvPushUsage } from "./usage.js";

export type ParseEnvPushArgsOptions = {
  readonly cwd: string;
  readonly defaultProjectSubdir?: string;
  readonly scriptPath?: string;
};

export type ParsedEnvPushArgs = {
  readonly selection: TargetSelection;
  readonly projectRoot: string;
};

const DEFAULT_PROJECT_SUBDIR = "apps/web";
const DEFAULT_SCRIPT_PATH = "scripts/env-push.ts";

const VALID_TARGETS: readonly TargetSelection[] = ["preview", "production", "staging", "all"];

export function parseEnvPushArgs(
  argv: readonly string[],
  options: ParseEnvPushArgsOptions
): ParsedEnvPushArgs {
  const scriptPath = options.scriptPath ?? DEFAULT_SCRIPT_PATH;
  const defaultProjectSubdir = options.defaultProjectSubdir ?? DEFAULT_PROJECT_SUBDIR;

  const [, , targetArg, ...rest] = argv;
  if (!targetArg) {
    printEnvPushUsage(scriptPath);
    throw new Error("Target is required");
  }

  if (!VALID_TARGETS.includes(targetArg as TargetSelection)) {
    printEnvPushUsage(scriptPath);
    throw new Error(`Unknown target: ${targetArg}`);
  }

  let projectRootExplicit = false;
  let projectRoot = resolve(options.cwd, defaultProjectSubdir);

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--project-root") {
      const value = rest[index + 1];
      if (!value) {
        throw new Error("--project-root requires a value");
      }
      projectRoot = resolve(options.cwd, value);
      projectRootExplicit = true;
      index += 1;
      continue;
    }

    if (arg.startsWith("--project-root=")) {
      const [, rawValue] = arg.split("=", 2);
      projectRoot = resolve(options.cwd, rawValue ?? "");
      projectRootExplicit = true;
      continue;
    }

    printEnvPushUsage(scriptPath);
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!(projectRootExplicit || existsSync(projectRoot))) {
    projectRoot = options.cwd;
  }

  return {
    selection: targetArg as TargetSelection,
    projectRoot,
  };
}

// EOF
