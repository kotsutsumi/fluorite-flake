/**
 * ユーザー確認プロンプトユーティリティ
 *
 * シンプルなYes/No確認プロンプトを提供します。
 */

import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline";

/**
 * ユーザーに確認プロンプトを表示し、Yes/Noの回答を取得
 *
 * @param message - 確認メッセージ
 * @param defaultValue - デフォルト値（Enterキーでの回答）
 * @returns ユーザーがYesを選択した場合はtrue、Noの場合はfalse
 */
export async function confirm(
    message: string,
    defaultValue = false
): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: stdin,
            output: stdout,
        });

        // プロンプト文字列を作成（デフォルト値を表示）
        const promptSuffix = defaultValue ? " (Y/n)" : " (y/N)";
        const fullPrompt = `${message}${promptSuffix} `;

        rl.question(fullPrompt, (answer) => {
            rl.close();

            const normalizedAnswer = answer.trim().toLowerCase();

            if (normalizedAnswer === "") {
                // 空の場合はデフォルト値を使用
                resolve(defaultValue);
                return;
            }

            // Yes系の回答
            if (
                ["y", "yes", "はい", "よろしく", "ok"].includes(
                    normalizedAnswer
                )
            ) {
                resolve(true);
                return;
            }

            // No系の回答
            if (
                ["n", "no", "いいえ", "だめ", "cancel"].includes(
                    normalizedAnswer
                )
            ) {
                resolve(false);
                return;
            }

            // その他の場合はデフォルト値を使用
            resolve(defaultValue);
        });
    });
}

// EOF
