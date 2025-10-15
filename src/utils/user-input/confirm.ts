/**
 * ユーザー確認プロンプトユーティリティ
 *
 * シンプルなYes/No確認プロンプトを提供します。
 */

import prompts from "prompts";

const affirmativeKeywords = new Set(["y", "yes", "はい", "よろしく", "ok", "true", "1"]);
const negativeKeywords = new Set(["n", "no", "いいえ", "だめ", "cancel", "false", "0"]);

/**
 * ユーザーに確認プロンプトを表示し、Yes/Noの回答を取得
 *
 * @param message - 確認メッセージ
 * @param defaultValue - デフォルト値（Enterキーでの回答）
 * @returns ユーザーがYesを選択した場合はtrue、Noの場合はfalse
 */
export async function confirm(message: string, defaultValue = false): Promise<boolean> {
    const promptSuffix = defaultValue ? " (Y/n)" : " (y/N)";
    const response = await prompts({
        type: "text",
        name: "answer",
        message: `${message}${promptSuffix}`,
        initial: defaultValue ? "y" : "n",
    });

    const normalizedAnswer = typeof response.answer === "string" ? response.answer.trim().toLowerCase() : "";

    if (normalizedAnswer === "") {
        return defaultValue;
    }

    if (affirmativeKeywords.has(normalizedAnswer)) {
        return true;
    }

    if (negativeKeywords.has(normalizedAnswer)) {
        return false;
    }

    return defaultValue;
}

// EOF
