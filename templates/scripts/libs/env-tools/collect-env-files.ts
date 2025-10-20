import { join } from "node:path";

import { getEnvFilenames } from "./get-env-filenames.js";
import { pathExists } from "./path-exists.js";

// プロジェクト内に実在する環境変数ファイルだけを抽出し、zip に渡しやすい
// 相対パスの配列として返す。
export async function collectEnvFiles(projectPath: string): Promise<string[]> {
  const existingFiles: string[] = [];

  for (const filename of getEnvFilenames()) {
    if (await pathExists(join(projectPath, filename))) {
      existingFiles.push(filename);
    }
  }

  return existingFiles;
}

// EOF
