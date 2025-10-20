import type { ProjectOperationResult } from "./env-types.js";
import { getEncryptedArchiveName } from "./get-encrypted-archive-name.js";

// 各プロジェクトの処理結果を分かりやすく表示し、暗号化・復号・スキップの
// 状況を即座に把握できるようにする。
export function logOperationResult(result: ProjectOperationResult): void {
  const prefix = `[${result.project.name}]`;

  if (result.status === "skipped") {
    console.log(`⚠️  ${prefix} Skipped - ${result.message}`);
    return;
  }

  if (result.kind === "encrypt") {
    console.log(
      `✅ ${prefix} Created ${getEncryptedArchiveName()} with: ${result.files.join(", ")}`
    );
    return;
  }

  console.log(`✅ ${prefix} Restored environment files: ${result.files.join(", ")}`);
}

// EOF
