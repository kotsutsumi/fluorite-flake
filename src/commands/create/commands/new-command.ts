/**
 * newコマンドの実装を提供するモジュール
 */
import { cancel, isCancel, text } from "@clack/prompts";
import { type CommandContext, defineCommand } from "citty";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getMessages } from "../../../i18n.js";
import { generateProject } from "../../../utils/project-generator/index.js";

// プロジェクト名の検証に利用する正規表現
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * プロジェクト名を取得する関数
 * @param args - コマンド引数
 * @returns プロジェクト名
 */
async function getProjectName(args: CommandContext["args"]): Promise<string> {
    const { new: messages } = getMessages();

    // コマンドライン引数からプロジェクト名を取得
    if (args._[0] && typeof args._[0] === "string") {
        const projectName = args._[0];

        // プロジェクト名のバリデーション
        if (!PROJECT_NAME_PATTERN.test(projectName)) {
            console.log(messages.invalidProjectName);
            process.exit(1);
        }

        return projectName;
    }

    // 引数がない場合は対話的にプロンプトで入力を求める
    while (true) {
        const response = await text({
            message: messages.projectNamePrompt,
            placeholder: messages.projectNamePlaceholder,
            validate(value) {
                const trimmed = (value || "").trim();

                if (!trimmed) {
                    return messages.projectNameRequired;
                }

                if (!PROJECT_NAME_PATTERN.test(trimmed)) {
                    return messages.invalidProjectName;
                }

                return;
            },
        });

        // 入力がキャンセルされた場合は終了
        if (isCancel(response)) {
            cancel(messages.operationCancelled);
            process.exit(0);
        }

        const trimmed = (response || "").trim();

        if (trimmed && PROJECT_NAME_PATTERN.test(trimmed)) {
            return trimmed;
        }
    }
}

/**
 * プロジェクトディレクトリのパスを決定する関数
 * @param projectName - プロジェクト名
 * @returns プロジェクトディレクトリのパス
 */
function getProjectDirectory(projectName: string): string {
    // 開発モードでは既に process.cwd() が temp/dev に変更されているため、
    // 開発時・本番時ともにプロジェクト名を追加するだけで正しいパスになる
    // - 開発時: temp/dev（現在地） + <project-name> = temp/dev/<project-name>
    // - 本番時: .（現在地） + <project-name> = ./<project-name>
    return path.join(process.cwd(), projectName);
}

/**
 * templates/ ディレクトリのパスを取得する関数
 * @returns templates/ ディレクトリのパス
 */
function getTemplatesDirectory(): string {
    // このファイルのディレクトリから templates/ への相対パスを計算
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // src/commands/create/commands/ -> templates/
    // 開発時は src/ からの相対パス、ビルド後は dist/ からの相対パス
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
        // 開発時: src/commands/create/commands/ -> templates/
        return path.join(__dirname, "../../../../templates");
    }

    // ビルド後: dist/commands/create/commands/ -> templates/
    return path.join(__dirname, "../../../../templates");
}

/**
 * newコマンドの定義
 */
export const newCommand = defineCommand({
    meta: {
        name: "new",
        description: getMessages().new.commandDescription,
    },
    args: {
        // プロジェクト名（位置引数）
        projectName: {
            type: "positional",
            description: "プロジェクト名",
            required: false,
        },
    },
    async run(context: CommandContext) {
        const { new: messages } = getMessages();

        // 1. プロジェクト名を取得
        const projectName = await getProjectName(context.args);

        // 2. プロジェクトディレクトリのパスを決定
        const targetDir = getProjectDirectory(projectName);

        // 3. ディレクトリの重複チェック
        if (fs.existsSync(targetDir)) {
            console.log(messages.directoryExists.replace("{directory}", targetDir));

            // 既存ディレクトリの削除確認
            const confirmResponse = await text({
                message: messages.confirmOverwrite,
                placeholder: "y/N",
            });

            if (isCancel(confirmResponse)) {
                cancel(messages.operationCancelled);
                process.exit(0);
            }

            const shouldOverwrite = confirmResponse === "y" || confirmResponse === "Y" || confirmResponse === "yes";

            if (!shouldOverwrite) {
                cancel(messages.operationCancelled);
                process.exit(0);
            }

            // 既存ディレクトリを削除
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        // 4. templates/ ディレクトリのパスを取得
        const templatesDir = getTemplatesDirectory();

        // 5. プロジェクトを生成
        const result = await generateProject({
            projectName,
            templatesDir,
            targetDir,
            runSetup: true,
        });

        // 6. 結果の表示
        if (result.success) {
            console.log("");
            console.log(messages.setupComplete.replace("{projectName}", projectName));
            console.log("");
            console.log(messages.nextStepsTitle);
            for (const cmd of messages.nextStepsCommands) {
                console.log(cmd.replace("{projectName}", projectName));
            }
            console.log("");
            console.log(messages.serverInfo);
            for (const server of messages.serverList) {
                console.log(server);
            }
            console.log("");
        } else {
            console.log("");
            console.log(messages.setupFailed);
            if (result.error) {
                console.log(result.error);
            }
            process.exit(1);
        }
    },
});

// EOF
