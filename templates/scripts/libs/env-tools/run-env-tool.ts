import { createUsageError } from "./create-usage-error.js";
import { handleDecrypt } from "./handle-decrypt.js";
import { handleEncrypt } from "./handle-encrypt.js";
import { printUsage } from "./print-usage.js";

// ENV ツールのサブコマンドを振り分けるファサード。
// コマンド固有の処理は各モジュールに任せ、ここではハンドオフだけを担当する。
export async function runEnvTool(command: string | undefined): Promise<void> {
  switch (command) {
    case "encrypt":
      // 環境ファイルを収集し暗号化アーカイブを生成する。
      await handleEncrypt();
      return;
    case "decrypt":
      // 暗号化アーカイブから環境ファイルを復元する。
      await handleDecrypt();
      return;
    default:
      // 未知のコマンド：ヘルプを表示し、スタックトレースを出さずに
      // 終了できるよう UsageError を投げ返す。
      printUsage();
      throw createUsageError("Invalid command");
  }
}

// EOF
