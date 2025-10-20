import { rm } from "node:fs/promises";
import { join } from "node:path";

import { collectEnvFiles } from "./collect-env-files.js";
import { directoryExists } from "./directory-exists.js";
import type { EncryptOptions, EnvProject, ProjectOperationResult } from "./env-types.js";
import { getEncryptedArchiveName } from "./get-encrypted-archive-name.js";
import { runCommand } from "./run-command.js";

// プロジェクト内の環境変数ファイルをまとめて暗号化アーカイブに格納する。
export async function encryptProjectEnv(
  project: EnvProject,
  options: EncryptOptions
): Promise<ProjectOperationResult> {
  const projectPath = join(options.rootDir, project.relativePath);

  // ワークスペースに存在しないプロジェクトはスキップする。
  if (!(await directoryExists(projectPath))) {
    return {
      kind: "encrypt",
      project,
      status: "skipped",
      message: `Directory not found: ${project.relativePath}`,
    };
  }

  const files = await collectEnvFiles(projectPath);
  // Nothing to encrypt if the project does not contain any env files.
  if (files.length === 0) {
    return {
      kind: "encrypt",
      project,
      status: "skipped",
      message: "No environment files found",
    };
  }

  // 既存のアーカイブがあれば削除して、前回の結果に追記されるのを防ぐ。
  await rm(join(projectPath, getEncryptedArchiveName()), { force: true });
  // zip の `-P` オプションでパスワード付きアーカイブを作成する。
  await runCommand("zip", ["-P", options.password, getEncryptedArchiveName(), ...files], {
    cwd: projectPath,
  });

  return {
    kind: "encrypt",
    project,
    status: "success",
    files,
  };
}

// EOF
