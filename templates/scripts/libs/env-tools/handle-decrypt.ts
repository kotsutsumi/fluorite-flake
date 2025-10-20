import { assertCommandAvailable } from "./assert-command-available.js";
import { createEnvToolError } from "./create-env-tool-error.js";
import { decryptProjectEnv } from "./decrypt-project-env.js";
import type { ProjectOperationResult } from "./env-types.js";
import { getEnvProjects } from "./get-env-projects.js";
import { getUnzipInstallInstructions } from "./get-unzip-install-instructions.js";
import { logOperationResult } from "./log-operation-result.js";
import { printSummary } from "./print-summary.js";
import { promptPassword } from "./prompt-password.js";

// 復号処理の一連の流れを制御する。
// 依存コマンドの存在確認→パスワード入力→各プロジェクトの復元→結果サマリー
// の順で処理を進める。
export async function handleDecrypt(): Promise<void> {
  // 暗号化アーカイブを展開するには unzip が必要。見つからない場合は
  // インストール手順を案内する。
  await assertCommandAvailable("unzip", getUnzipInstallInstructions());

  const password = await promptPassword("Enter password for decryption: ");
  const rootDir = process.cwd();
  const results: ProjectOperationResult[] = [];

  for (const project of getEnvProjects()) {
    console.log(`\n[${project.name}] Decrypting environment files...`);
    try {
      // 環境ファイルを復元し、後で要約を表示できるよう結果を収集する。
      const result = await decryptProjectEnv(project, { rootDir, password });
      results.push(result);
      logOperationResult(result);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw createEnvToolError(
        `Decryption failed for ${project.relativePath}: ${details}\n👉 Please verify the password and try again.`
      );
    }
  }

  printSummary(results);
}

// EOF
