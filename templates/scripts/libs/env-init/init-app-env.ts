import { promises as fs } from "node:fs";
import path from "node:path";

import { ENV_EXAMPLE_PATTERN } from "./constants.js";
import { getTargetEnvFileName } from "./file-name-utils.js";
import type { InitResult } from "./types.js";

/**
 * 指定されたアプリディレクトリ内の .env.*.example ファイルを処理
 *
 * @param appName - アプリケーション名
 * @param appDir - アプリケーションディレクトリの絶対パス
 * @returns 作成されたファイルとスキップされたファイルのリスト
 */
export async function initEnvFilesForApp(
  appName: string,
  appDir: string
): Promise<Pick<InitResult, "created" | "skipped">> {
  const created: InitResult["created"] = [];
  const skipped: InitResult["skipped"] = [];

  try {
    const entries = await fs.readdir(appDir, { withFileTypes: true });

    for (const entry of entries) {
      // .env.*.example パターンにマッチするファイルのみ処理
      if (!(entry.isFile() && ENV_EXAMPLE_PATTERN.test(entry.name))) {
        continue;
      }

      const exampleFilePath = path.join(appDir, entry.name);
      const targetFileName = getTargetEnvFileName(entry.name);
      const targetFilePath = path.join(appDir, targetFileName);

      // ターゲットファイルが既に存在する場合はスキップ
      try {
        await fs.access(targetFilePath);
        skipped.push({ app: appName, file: targetFileName });
        continue;
      } catch {
        // ファイルが存在しない場合は次へ進む
      }

      // .example ファイルをコピー
      await fs.copyFile(exampleFilePath, targetFilePath);
      created.push({ app: appName, file: targetFileName });
    }
  } catch (error) {
    // ファイルシステムの権限エラーなど、まれなケースのため除外
    /* c8 ignore next 3 */
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return { created, skipped };
}

// EOF
