// env-push 全体のオーケストレーションを担当するモジュール。
// ここではターゲット配列の生成と依存モジュールの呼び出し順序だけを管理し、
// 実際の副作用は ensurePrerequisites / pushTarget に委譲している。
import { ensurePrerequisites } from "./ensure-prerequisites.js";
import { pushTarget } from "./push-target.js";
import type { RunCommandFn } from "./run-command.js";
import { TARGETS, type TargetName, type TargetSelection } from "./types.js";

export type RunEnvPushOptions = {
  readonly selection: TargetSelection;
  readonly projectRoot: string;
  readonly cwd: string;
  readonly environment?: NodeJS.ProcessEnv;
};

export type RunEnvPushDependencies = {
  readonly runCommand: RunCommandFn;
};

function resolveTargetNames(selection: TargetSelection): TargetName[] {
  if (selection === "all") {
    return Object.keys(TARGETS) as TargetName[];
  }
  return [selection];
}

export async function runEnvPush(
  options: RunEnvPushOptions,
  dependencies: RunEnvPushDependencies
): Promise<void> {
  const projectConfig = await ensurePrerequisites(
    options.projectRoot,
    options.environment,
    dependencies
  );

  const targetNames = resolveTargetNames(options.selection);

  for (const targetName of targetNames) {
    await pushTarget(
      targetName,
      {
        cwd: options.cwd,
        projectRoot: options.projectRoot,
        projectConfig,
      },
      {
        runCommand: dependencies.runCommand,
      }
    );
  }
}

export type { ProjectConfig } from "./types.js";

// EOF
