/**
 * プロジェクト生成のメイン処理
 */
import fs from "node:fs";
import ora from "ora";
import { copyTemplates } from "./copy-templates.js";
import { replaceInProject } from "./replace-in-project.js";
import { runSetupCommands } from "./run-setup-commands.js";
import type { ProjectGeneratorOptions, SetupResult } from "./types.js";

/**
 * プロジェクトを生成する関数
 * @param options - プロジェクト生成オプション
 * @returns セットアップ結果
 */
export async function generateProject(options: ProjectGeneratorOptions): Promise<SetupResult> {
    const { projectName, templatesDir, targetDir, runSetup = true } = options;

    // スピナーを初期化
    const spinner = ora({
        text: `プロジェクト "${projectName}" を生成中...`,
    }).start();

    try {
        // 1. ターゲットディレクトリの作成
        spinner.text = "プロジェクトディレクトリを作成中...";
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 2. templates/ ディレクトリのコピー
        spinner.text = "テンプレートをコピー中...";
        await copyTemplates(templatesDir, targetDir);

        // 3. ファイル内容の文字列置換
        spinner.text = "ファイル内容を置換中...";
        const processedFiles = replaceInProject(targetDir, projectName);
        spinner.text = `${processedFiles} 個のファイルを処理しました`;

        // 4. セットアップコマンドの実行
        if (runSetup) {
            spinner.text = "セットアップコマンドを実行中...";
            const setupResult = await runSetupCommands(targetDir, spinner);

            if (!setupResult.success) {
                // セットアップに失敗した場合
                spinner.fail(`セットアップコマンドが失敗しました: ${setupResult.command}`);
                return setupResult;
            }
        }

        // 成功
        spinner.succeed(`プロジェクト "${projectName}" のセットアップが完了しました！`);

        return {
            success: true,
        };
    } catch (error) {
        // エラーが発生した場合
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(`プロジェクト生成に失敗しました: ${errorMessage}`);

        return {
            success: false,
            error: errorMessage,
        };
    }
}

// EOF
