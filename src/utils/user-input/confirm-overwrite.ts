/**
 * ディレクトリ上書き確認機能
 */
import fs from "node:fs";
import readline from "node:readline/promises";

import { getMessages } from "../../i18n.js";

/**
 * 既存ディレクトリが存在する場合の削除確認
 */
export async function confirmDirectoryOverwrite(directoryPath: string): Promise<boolean> {
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
        console.log(create.directoryExists.replace("{0}", directoryPath));

        const answer = await rl.question(create.confirmOverwrite);

        // y, Y, yes, Yes, YES のいずれかの場合は上書きを許可
        const confirmPattern = /^(y|yes)$/i;
        const shouldOverwrite = confirmPattern.test(answer.trim());

        if (shouldOverwrite) {
            // 既存ディレクトリを削除
            try {
                fs.rmSync(directoryPath, { recursive: true, force: true });
                console.log(create.directoryRemoved.replace("{0}", directoryPath));
                return true;
            } catch (error) {
                console.error(create.failedToRemoveDirectory.replace("{0}", directoryPath));
                console.error(error);
                return false;
            }
        } else {
            console.log(create.operationCancelled);
            return false;
        }
    } finally {
        rl.close();
    }
}

// EOF
