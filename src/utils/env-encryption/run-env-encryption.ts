/**
 * 環境変数暗号化の実行
 * - execaによるpnpm env:encryptコマンド実行
 * - エラーハンドリングとログ出力
 * - モノレポ・単一リポジトリ両対応
 */

import { join } from "node:path";
import { execa } from "execa";
import { getMessages } from "../../i18n.js";

export type EncryptionResult = {
    success: boolean;
    zipPath?: string;
    error?: string;
    skipped?: boolean;
    cancelled?: boolean;
};

/**
 * 環境変数暗号化を実行
 */
export async function runEnvEncryption(appDirectory: string, isMonorepo = false): Promise<EncryptionResult> {
    const messages = getMessages();

    try {
        console.log(messages.create.envEncryption.processing);

        // モノレポかどうかでコマンドを分岐
        const args = isMonorepo ? ["--filter", appDirectory, "env:encrypt"] : ["env:encrypt"];

        await execa("pnpm", args, {
            cwd: isMonorepo ? process.cwd() : appDirectory,
            stdio: "inherit", // パスワード入力を透過
            timeout: 120_000, // 2分タイムアウト
        });

        // 成功時の処理
        const zipPath = join(appDirectory, "env-files.zip");
        console.log(messages.create.envEncryption.success(`${zipPath}`));
        console.log(messages.create.envEncryption.shareInstruction);

        return {
            success: true,
            zipPath,
        };
    } catch (error) {
        // エラー時の処理
        console.error(messages.create.envEncryption.failed);

        if (error instanceof Error) {
            // エラーの詳細ログ出力
            console.error(`  ${error.message}`);

            return {
                success: false,
                error: error.message,
            };
        }

        return {
            success: false,
            error: "不明なエラーが発生しました",
        };
    }
}

// EOF
