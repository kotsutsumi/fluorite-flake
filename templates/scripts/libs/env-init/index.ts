#!/usr/bin/env tsx
/**
 * 環境変数ファイル初期化ユーティリティ。
 * - apps/<name>/ 配下の .env.*.example ファイルを検出
 * - 対応する .env.* ファイルが存在しない場合のみコピー
 * - 既存の .env.* ファイルは上書きしない（安全性確保）
 */

// 公開 API のエクスポート
export { APPS_DIR, ENV_EXAMPLE_PATTERN } from "./constants.js";
export { getTargetEnvFileName } from "./file-name-utils.js";
export { initAllEnvFiles } from "./init-all-env.js";
export { initEnvFilesForApp } from "./init-app-env.js";
export { printResult } from "./print-result.js";
export type { InitResult } from "./types.js";

// メインエントリーポイント（CLI 実行時のみ）
import { initAllEnvFiles } from "./init-all-env.js";
import { printResult } from "./print-result.js";

/**
 * メインエントリーポイント
 * @internal テスト用にエクスポート
 */
export async function main(): Promise<void> {
  const result = await initAllEnvFiles();
  printResult(result);
}

/* c8 ignore start */
// スクリプトとして直接実行された場合のみ main() を実行
// CLIエントリーポイントはテストが困難なため除外
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
/* c8 ignore stop */

// EOF
