/**
 * プロジェクト名の入力を促進する機能
 */
import { cancel, isCancel, text } from "@clack/prompts";

import { getMessages } from "../../i18n.js";

// プロジェクト名の検証に利用する正規表現
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
// 入力が空だった場合に利用するデフォルト名
const DEFAULT_PROJECT_NAME = "my-fluorite-project";

/**
 * プロジェクト名の入力を促進する
 */
export async function promptForProjectName(): Promise<string> {
    const { create } = getMessages();

    // Clack のテキストプロンプトでガイド付きの入力UIを表示
    const response = await text({
        message: create.promptProjectName,
        placeholder: create.projectNamePlaceholder,
        validate(value) {
            const trimmed = value.trim();

            // 入力が空の場合はデフォルト名を後段で採用するためバリデーションを通過させる
            if (!trimmed) {
                return;
            }

            // 許可文字以外が含まれている場合はエラーメッセージを表示
            if (!PROJECT_NAME_PATTERN.test(trimmed)) {
                return create.invalidProjectName;
            }

            return;
        },
    });

    // 入力がキャンセルされた場合は終了メッセージを表示して即座に終了
    if (isCancel(response)) {
        cancel(create.operationCancelled);
        process.exit(0);
    }

    const trimmed = response.trim();

    // 入力が空の場合はデフォルト名を利用
    if (!trimmed) {
        console.log(create.usingDefaultProjectName);
        return DEFAULT_PROJECT_NAME;
    }

    return trimmed;
}

// EOF
