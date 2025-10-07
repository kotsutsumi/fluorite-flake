/**
 * 暗号化実行の対話的確認プロンプト
 * - ユーザーへの確認メッセージ表示
 * - 国際化対応
 * - 実行/スキップの選択処理
 */

import { confirm } from "@clack/prompts";
import { getMessages } from "../../i18n.js";

export type EncryptionPromptResult = {
    shouldEncrypt: boolean;
    cancelled: boolean;
};

/**
 * 暗号化実行確認プロンプトを表示
 */
export async function createEncryptionPrompt(): Promise<EncryptionPromptResult> {
    const messages = getMessages();

    try {
        const result = await confirm({
            message: messages.create.envEncryption.confirmPrompt,
            initialValue: true, // デフォルトYES
        });

        if (typeof result === "boolean") {
            return {
                shouldEncrypt: result,
                cancelled: false,
            };
        }

        // キャンセルされた場合（Ctrl+Cなど）
        return {
            shouldEncrypt: false,
            cancelled: true,
        };
    } catch (error) {
        // プロンプトが失敗した場合（非TTY環境など）
        return {
            shouldEncrypt: false,
            cancelled: true,
        };
    }
}

// EOF
