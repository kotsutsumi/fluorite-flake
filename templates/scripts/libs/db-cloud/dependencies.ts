/**
 * CLI 実行時に利用するデフォルト依存関係を構築するモジュール。
 * テストではこのモジュールを差し替えることで副作用を抑えられる。
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createReadlinePrompt } from "./base-name.js";
import { createRunCommand, createRunCommandCapture } from "./command-executor.js";
import { createEnvManagerDeps } from "./env-manager.js";
import { createConsoleLogger } from "./logger.js";
import type { DbCloudRunnerDeps, Logger } from "./types.js";

export function createDefaultRunnerDeps(): DbCloudRunnerDeps {
  const projectRoot = resolve(process.cwd());
  const backendRoot = join(projectRoot, "apps", "backend");
  const logger = createConsoleLogger();
  return {
    projectRoot,
    backendRoot,
    env: process.env,
    logger,
    runCommand: createRunCommand(),
    runCommandCapture: createRunCommandCapture(),
  };
}

export function createDefaultEnvDeps(logger: Logger) {
  return createEnvManagerDeps(logger, {
    readFile,
    writeFile,
    mkdir,
    exists: existsSync,
  });
}

export function promptWithReadline(message: string): Promise<string> {
  return createReadlinePrompt(message);
}

// EOF
