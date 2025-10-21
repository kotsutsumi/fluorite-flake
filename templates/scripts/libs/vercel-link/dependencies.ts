/**
 * CLI 実行時に利用するデフォルト依存関係を構築するモジュール
 * テストではこのモジュールを差し替えることで副作用を抑えられる
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { createRunCommand, createRunCommandCapture } from "./command-executor.js";
import { createConsoleLogger } from "./logger.js";
import type { PromptFn, VercelLinkDeps } from "./types.js";

export function createReadlinePrompt(): PromptFn {
  return async (message: string): Promise<string> => {
    const rl = createInterface({ input, output });
    try {
      return await rl.question(message);
    } finally {
      rl.close();
    }
  };
}

export function createDefaultDeps(): VercelLinkDeps {
  const projectRoot = resolve(process.cwd());
  const logger = createConsoleLogger();

  return {
    projectRoot,
    logger,
    prompt: createReadlinePrompt(),
    runCommand: createRunCommand(),
    runCommandCapture: createRunCommandCapture(),
    readFile: async (path: string) => readFile(path, "utf8"),
    writeFile: async (path: string, content: string) => writeFile(path, content, "utf8"),
    exists: existsSync,
  };
}

// EOF
