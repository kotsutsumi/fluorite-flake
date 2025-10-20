import { join } from "node:path";

import { collectEnvFiles } from "./collect-env-files.js";
import { directoryExists } from "./directory-exists.js";
import type { DecryptOptions, EnvProject, ProjectOperationResult } from "./env-types.js";
import { getEncryptedArchiveName } from "./get-encrypted-archive-name.js";
import { pathExists } from "./path-exists.js";
import { runCommand } from "./run-command.js";

// 暗号化された環境変数アーカイブを復元する処理。
export async function decryptProjectEnv(
  project: EnvProject,
  options: DecryptOptions
): Promise<ProjectOperationResult> {
  const projectPath = join(options.rootDir, project.relativePath);

  // ワークスペースにディレクトリが無い場合は静かにスキップする。
  if (!(await directoryExists(projectPath))) {
    return {
      kind: "decrypt",
      project,
      status: "skipped",
      message: `Directory not found: ${project.relativePath}`,
    };
  }

  if (!(await pathExists(join(projectPath, getEncryptedArchiveName())))) {
    return {
      kind: "decrypt",
      project,
      status: "skipped",
      message: `${getEncryptedArchiveName()} not found`,
    };
  }

  // zip と対になる `unzip -P` でパスワード復号を実施する。
  await runCommand("unzip", ["-o", "-P", options.password, getEncryptedArchiveName()], {
    cwd: projectPath,
  });

  const files = await collectEnvFiles(projectPath);

  return {
    kind: "decrypt",
    project,
    status: "success",
    files,
  };
}

// EOF
