import { assertCommandAvailable } from "./assert-command-available.js";
import { createEnvToolError } from "./create-env-tool-error.js";
import { encryptProjectEnv } from "./encrypt-project-env.js";
import type { ProjectOperationResult } from "./env-types.js";
import { getEnvProjects } from "./get-env-projects.js";
import { getZipInstallInstructions } from "./get-zip-install-instructions.js";
import { logOperationResult } from "./log-operation-result.js";
import { printSummary } from "./print-summary.js";
import { promptPassword } from "./prompt-password.js";

// 暗号化処理の全体フローを制御する。
// 復号フローと同様に、前提条件の確認からサマリー表示までを一括で行う。
export async function handleEncrypt(): Promise<void> {
  // zip コマンドが無い場合はインストール手順を案内し、処理を中断する。
  await assertCommandAvailable("zip", getZipInstallInstructions());

  const password = await promptPassword("Enter password for encryption: ");
  const confirmation = await promptPassword("Confirm password: ");

  if (password !== confirmation) {
    throw createEnvToolError("Passwords do not match");
  }

  const rootDir = process.cwd();
  const results: ProjectOperationResult[] = [];

  for (const project of getEnvProjects()) {
    console.log(`\n[${project.name}] Encrypting environment files...`);
    try {
      // プロジェクト内の .env ファイルを収集して暗号化し、結果を記録する。
      const result = await encryptProjectEnv(project, { rootDir, password });
      results.push(result);
      logOperationResult(result);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw createEnvToolError(`Encryption failed for ${project.relativePath}: ${details}`);
    }
  }

  printSummary(results);
}

// EOF
