/**
 * Expo + Fullstack Admin テンプレートジェネレーター
 */
import { join } from "node:path";

import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "expo-fullstack-admin";
const VARIABLE_FILES = [
    "package.json",
    "apps/backend/package.json",
    "apps/mobile/package.json",
    "apps/admin/package.json",
    "packages/shared/package.json",
];

/**
 * Expo + Fullstack Admin プロジェクトの生成
 */
export async function generateExpoFullstackAdmin(context: GenerationContext): Promise<TemplateGenerationResult> {
    const { config, targetDirectory } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [targetDirectory];
    const nextSteps = [
        "環境変数の設定: cp .env.example .env && .envファイルを編集",
        "パッケージのインストール: pnpm install",
        "データベースの初期設定: pnpm setup",
        "開発サーバーの起動: pnpm dev",
        "",
        "各アプリケーションの個別起動:",
        "  - GraphQLサーバー: pnpm --filter backend dev",
        "  - 管理画面: pnpm --filter admin dev",
        "  - モバイルアプリ: pnpm --filter mobile dev",
        "",
        "アクセス方法:",
        "  - 管理画面: http://localhost:3000",
        "  - GraphQL Playground: http://localhost:4000/graphql",
        "  - モバイルアプリ: Expo Goでスキャン",
        "",
        "開発ガイド:",
        "  - ユーザー管理とロール設定は管理画面で行えます",
        "  - モバイルアプリからもCRUD操作が可能です",
        "  - GraphQLスキーマの変更時は共通パッケージも更新してください",
    ];

    try {
        const result = await copyTemplateDirectory({
            templateName: TEMPLATE_NAME,
            targetDirectory,
            variableFiles: VARIABLE_FILES,
            variables: {
                "{{projectName}}": config.name,
                "{{PROJECT_NAME}}": config.name,
            },
        });

        filesCreated.push(...result.files);
        directoriesCreated.push(...result.directories.map((relativePath) => join(targetDirectory, relativePath)));

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
