/**
 * プロジェクト名の入力を促進する機能
 */
import { cancel, isCancel, text } from "@clack/prompts";

import { getMessages } from "../../i18n.js";
import { checkProjectExists } from "./check-project-exists.js";

// プロジェクト名の検証に利用する正規表現
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * プロジェクト名の入力を促進する
 */
export async function promptForProjectName(): Promise<string> {
    const { create } = getMessages();

    while (true) {
        // Clack のテキストプロンプトでガイド付きの入力UIを表示
        const response = await text({
            message: create.promptProjectName,
            placeholder: create.projectNamePlaceholder,
            validate(value) {
                // value が undefined の場合は空文字列として扱う
                const trimmed = (value || "").trim();

                // 入力が空の場合はエラーメッセージを表示
                if (!trimmed) {
                    return create.projectNameRequired;
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

        // response が undefined の場合は空文字列として扱う
        const trimmed = (response || "").trim();

        // 入力が有効な場合はプロジェクト存在チェックを行う
        if (trimmed && PROJECT_NAME_PATTERN.test(trimmed)) {
            // プロジェクトが既に存在するかチェック
            if (checkProjectExists(trimmed)) {
                console.log(
                    create.projectAlreadyExists.replace("{name}", trimmed)
                );
                // 既に存在する場合は再度入力を促す
                continue;
            }

            return trimmed;
        }

        // 空の場合は再度入力を促す（validate関数でエラーメッセージが表示される）
    }
}

// EOF
