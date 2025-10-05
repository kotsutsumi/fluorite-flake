/**
 * ディレクトリ上書き確認機能
 */
import fs from "node:fs";
import readline from "node:readline/promises";

import { getMessages } from "../../i18n.js";

/**
 * 既存ディレクトリが存在する場合の削除確認
 */
export async function confirmDirectoryOverwrite(
    directoryPath: string
): Promise<boolean> {
    const { create } = getMessages();

    // ディレクトリが存在しない場合は確認不要
    if (!fs.existsSync(directoryPath)) {
        return true;
    }

    // readlineインターフェースを作成
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        // 上書き確認のメッセージを表示
        const existsMessage =
            (create as any).directoryExists ||
            "⚠️ ディレクトリ '{0}' は既に存在します。";
        console.log(existsMessage.replace("{0}", directoryPath));

        const confirmMessage =
            (create as any).confirmOverwrite ||
            "削除して新しいプロジェクトを作成しますか？ (y/N): ";
        const answer = await rl.question(confirmMessage);

        // y, Y, yes, Yes, YES のいずれかの場合は上書きを許可
        const confirmPattern = /^(y|yes)$/i;
        const shouldOverwrite = confirmPattern.test(answer.trim());

        if (shouldOverwrite) {
            // 既存ディレクトリを削除
            try {
                fs.rmSync(directoryPath, { recursive: true, force: true });
                const removedMessage =
                    (create as any).directoryRemoved ||
                    "✅ 既存のディレクトリを削除しました: {0}";
                console.log(removedMessage.replace("{0}", directoryPath));
                return true;
            } catch (error) {
                const failedMessage =
                    (create as any).failedToRemoveDirectory ||
                    "❌ ディレクトリの削除に失敗しました: {0}";
                console.error(failedMessage.replace("{0}", directoryPath));
                console.error(error);
                return false;
            }
        } else {
            const cancelledMessage =
                (create as any).operationCancelled ||
                "操作がキャンセルされました。";
            console.log(cancelledMessage);
            return false;
        }
    } finally {
        rl.close();
    }
}

// EOF
