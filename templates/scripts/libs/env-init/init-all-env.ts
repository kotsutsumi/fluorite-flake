import { promises as fs } from "node:fs";
import path from "node:path";

import { APPS_DIR } from "./constants.js";
import { initEnvFilesForApp } from "./init-app-env.js";
import type { InitResult } from "./types.js";

/**
 * apps/ 配下の全アプリケーションの環境変数ファイルを初期化
 *
 * @returns 作成されたファイルとスキップされたファイルの全体結果
 * @throws apps/ ディレクトリが存在しない場合はエラー
 */
export async function initAllEnvFiles(): Promise<InitResult> {
  const created: InitResult["created"] = [];
  const skipped: InitResult["skipped"] = [];

  try {
    const apps = await fs.readdir(APPS_DIR, { withFileTypes: true });

    for (const entry of apps) {
      if (!entry.isDirectory()) {
        continue;
      }

      const appDir = path.join(APPS_DIR, entry.name);
      const result = await initEnvFilesForApp(entry.name, appDir);

      created.push(...result.created);
      skipped.push(...result.skipped);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`apps/ directory not found: ${APPS_DIR}`);
    }
    // ファイルシステムの権限エラーなど、まれなケースのため除外
    /* c8 ignore next 2 */
    throw error;
  }

  return { created, skipped };
}

// EOF
