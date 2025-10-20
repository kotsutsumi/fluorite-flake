import { constants } from "node:fs";
import { access } from "node:fs/promises";

import type { EnsurePrerequisitesDependencies } from "../env-push/ensure-prerequisites.js";
import type { RunCommandFn } from "../env-push/run-command.js";
import type { ProjectConfig, TargetName, TargetSelection } from "../env-push/types.js";
import { TARGETS } from "../env-push/types.js";
import type { PullTargetDependencies } from "./pull-target.js";
import {
  NEXT_APP_CONFIGS,
  type NextAppConfig,
  type NextAppName,
  resolveAppDir,
  type TargetSelectionOption,
} from "./types.js";

export type EnsurePrerequisitesFn = (
  projectRoot: string,
  environment: NodeJS.ProcessEnv | undefined,
  dependencies: EnsurePrerequisitesDependencies
) => Promise<ProjectConfig | null>;

export type RunEnvPullOptions = {
  readonly projectRoot: string;
  readonly cwd: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly selection?: TargetSelectionOption;
  readonly apps?: readonly NextAppName[];
};

export type RunEnvPullDependencies = {
  readonly runCommand: RunCommandFn;
  readonly ensurePrerequisites: EnsurePrerequisitesFn;
  readonly pullTarget: (
    options: Parameters<typeof pullTarget>[0],
    dependencies: PullTargetDependencies
  ) => Promise<void>;
};

const TARGET_ORDER: readonly TargetName[] = ["preview", "staging", "production"];

function resolveTargetNames(selection: TargetSelection): readonly TargetName[] {
  if (selection === "all") {
    return TARGET_ORDER;
  }
  if (!(selection in TARGETS)) {
    throw new Error(`Unknown target: ${selection}`);
  }
  return [selection as TargetName];
}

function resolveAppConfigs(apps: readonly NextAppName[] | undefined): readonly NextAppConfig[] {
  if (!apps || apps.length === 0) {
    return NEXT_APP_CONFIGS;
  }
  const appSet = new Set(apps);
  return NEXT_APP_CONFIGS.filter((config) => appSet.has(config.name));
}

async function ensureAppDirectory(appDir: string, appName: NextAppName): Promise<void> {
  try {
    await access(appDir, constants.F_OK);
  } catch {
    throw new Error(`[${appName}] Application directory not found: ${appDir}`);
  }
}

export async function runEnvPull(
  options: RunEnvPullOptions,
  dependencies: RunEnvPullDependencies
): Promise<void> {
  const selection = options.selection ?? "all";
  const targetNames = resolveTargetNames(selection);
  const appConfigs = resolveAppConfigs(options.apps);
  for (const appConfig of appConfigs) {
    const appDir = resolveAppDir(options.projectRoot, appConfig);
    await ensureAppDirectory(appDir, appConfig.name);

    const projectConfig = await dependencies.ensurePrerequisites(appDir, options.environment, {
      runCommand: dependencies.runCommand,
    });

    for (const targetName of targetNames) {
      await dependencies.pullTarget(
        {
          appName: appConfig.name,
          appDir,
          targetName,
          environment: options.environment,
          projectConfig,
        },
        { runCommand: dependencies.runCommand }
      );
    }
  }
}

// EOF
