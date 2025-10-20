#!/usr/bin/env tsx
// ENV 管理 CLI のエントリーポイント。
// サブコマンドを解釈し、ハンドルされない例外を利用者に分かりやすい
// メッセージとして出力しつつ、CI に適切な終了コードを返す。
import { isEnvToolError } from "./libs/env-tools/is-env-tool-error.js";
import { isUsageError } from "./libs/env-tools/is-usage-error.js";
import { runEnvTool } from "./libs/env-tools/run-env-tool.js";

/**
 * CLI のメインエラーハンドラー。
 * テスト可能にするため、関数として抽出。
 */
export async function handleEnvToolsError(command: string | undefined): Promise<void> {
  try {
    await runEnvTool(command);
  } catch (error) {
    // 使い方の誤り（コマンド未指定など）は既にガイダンスを表示しているため、
    // 非ゼロ終了コードで終了するだけで良い。
    if (isUsageError(error)) {
      process.exit(1);
    }

    // ツール固有のエラーは人間向けメッセージを含んでいるので、そのまま出力する。
    if (isEnvToolError(error)) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    }

    // 想定外の例外は原因調査に役立つようにメッセージをそのまま表示する。
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// CLI として実行された場合のみメインハンドラーを起動
// テスト時には実行されない（VITEST環境変数で判定）
/* c8 ignore next 3 */
if (!process.env.VITEST) {
  handleEnvToolsError(process.argv[2]);
}

// EOF
