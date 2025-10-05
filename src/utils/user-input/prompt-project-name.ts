/**
 * プロジェクト名の入力を促進する機能
 */
import readline from "node:readline/promises";

import { getMessages } from "../../i18n.js";

/**
 * プロジェクト名の入力を促進する
 */
export async function promptForProjectName(): Promise<string> {
    const { create } = getMessages();

    // readlineインターフェースを作成
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        // プロジェクト名の入力を求める
        const promptMessage =
            (create as any).promptProjectName ||
            "プロジェクト名を入力してください: ";
        const projectName = await rl.question(promptMessage);

        // 入力が空の場合はデフォルト値を使用
        if (!projectName.trim()) {
            const defaultMessage =
                (create as any).usingDefaultProjectName ||
                "ℹ️ デフォルトのプロジェクト名を使用します: my-fluorite-project";
            console.log(defaultMessage);
            return "my-fluorite-project";
        }

        // 入力された名前を検証
        const trimmedName = projectName.trim();

        // 基本的な名前検証（アルファベット、数字、ハイフン、アンダースコアのみ許可）
        const namePattern = /^[a-zA-Z0-9_-]+$/;
        if (!namePattern.test(trimmedName)) {
            const errorMessage =
                (create as any).invalidProjectName ||
                "❌ 無効なプロジェクト名です。英数字、ハイフン、アンダースコアのみ使用できます。";
            console.log(errorMessage);
            return await promptForProjectName(); // 再帰的に再入力を求める
        }

        return trimmedName;
    } finally {
        rl.close();
    }
}

// EOF
