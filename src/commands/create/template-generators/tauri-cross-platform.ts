/**
 * Tauri クロスプラットフォームテンプレートジェネレーター
 */
import { join } from "node:path";

import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "tauri-cross-platform";
const VARIABLE_FILES = ["package.json"];

/**
 * Tauri クロスプラットフォームプロジェクトの生成
 */
export async function generateTauriCrossPlatform(
    context: GenerationContext
): Promise<TemplateGenerationResult> {
    const { config, targetDirectory } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [targetDirectory];
    const nextSteps = [
        "pnpm install - 依存関係をインストール",
        "pnpm tauri:dev - デスクトップアプリを開発モードで起動",
        "pnpm tauri:android - Android ビルドを実行",
        "pnpm tauri:ios - iOS ビルドを実行",
        "pnpm lint - コード品質チェックを実行",
        "pnpm format - コードフォーマットを整える",
    ];

    try {
        const result = await copyTemplateDirectory({
            templateName: TEMPLATE_NAME,
            targetDirectory,
            variableFiles: VARIABLE_FILES,
            variables: { "{{PROJECT_NAME}}": config.name },
        });

        filesCreated.push(...result.files);
        directoriesCreated.push(
            ...result.directories.map((relativePath) =>
                join(targetDirectory, relativePath)
            )
        );

        return {
            success: true,
            filesCreated,
            directoriesCreated,
            nextSteps,
        };
    } catch (error) {
        return {
            success: false,
            filesCreated,
            directoriesCreated,
            nextSteps,
            errors: [error instanceof Error ? error.message : String(error)],
        };
    }
}

// EOF
