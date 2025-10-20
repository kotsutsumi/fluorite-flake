import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import process from "node:process";
import { readEnvMap } from "../env-push/read-env-map.js";
import type { RunCommandFn } from "../env-push/run-command.js";
import {
  type ProjectConfig,
  TARGETS,
  type TargetConfig,
  type TargetName,
} from "../env-push/types.js";
import { mergeEnvFile } from "./merge-env-file.js";
import type { NextAppName } from "./types.js";

export type PullTargetOptions = {
  readonly appName: NextAppName;
  readonly appDir: string;
  readonly targetName: TargetName;
  readonly environment?: NodeJS.ProcessEnv;
  readonly projectConfig: ProjectConfig | null;
};

export type PullTargetDependencies = {
  readonly runCommand: RunCommandFn;
};

const TEMP_PREFIX = join(tmpdir(), "env-pull-");

function createCommandEnv(
  baseEnv: NodeJS.ProcessEnv | undefined,
  projectConfig: ProjectConfig | null
): NodeJS.ProcessEnv {
  const env = {
    ...process.env,
    ...(baseEnv ?? {}),
  } as NodeJS.ProcessEnv;

  if (projectConfig) {
    env.VERCEL_ORG_ID = projectConfig.orgId;
    env.VERCEL_PROJECT_ID = projectConfig.projectId;
  }

  return env;
}

function buildCommandArgs(envFilePath: string, config: TargetConfig): readonly string[] {
  const args = ["env", "pull", envFilePath, "--environment", config.deploymentTarget, "--yes"];
  if (config.gitBranch) {
    args.push("--git-branch", config.gitBranch);
  }
  return args;
}

export async function pullTarget(
  options: PullTargetOptions,
  dependencies: PullTargetDependencies
): Promise<void> {
  const config = TARGETS[options.targetName];
  const tempDir = await mkdtemp(TEMP_PREFIX);
  const tempEnvPath = join(tempDir, config.envFile);
  const targetEnvPath = join(options.appDir, config.envFile);

  const commandEnv = createCommandEnv(options.environment, options.projectConfig);
  const args = buildCommandArgs(tempEnvPath, config);

  const relativePath = relative(options.appDir, targetEnvPath);
  console.log(
    `⬇️  Pulling ${options.targetName} environment for ${options.appName} -> ${relativePath}`
  );

  try {
    await dependencies.runCommand("vercel", args, {
      cwd: options.appDir,
      env: commandEnv,
    });

    const variables = await readEnvMap(tempEnvPath);

    const content = await mergeEnvFile(targetEnvPath, variables, {
      appName: options.appName,
      targetName: options.targetName,
    });
    await writeFile(targetEnvPath, content, "utf8");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
// EOF
