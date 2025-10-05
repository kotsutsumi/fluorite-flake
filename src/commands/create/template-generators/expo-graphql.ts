/**
 * Expo + GraphQL バックエンドテンプレートジェネレーター
 */
import { join } from "node:path";
import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "expo-graphql";
const VARIABLE_FILES = ["package.json"];

/**
 * Expo + GraphQL プロジェクトの生成
 */
export async function generateExpoGraphQL(
    context: GenerationContext
): Promise<TemplateGenerationResult> {
    const { config, targetDirectory } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [targetDirectory];
    const nextSteps = [
        "npm install - パッケージをインストール",
        "cd backend && npx prisma generate - Prismaクライアントを生成",
        "cd backend && npx prisma migrate dev - データベースマイグレーションを実行",
        "npm run backend:dev - GraphQLサーバーを起動",
        "npm run expo:start - Expoアプリを起動",
        "Expo Goアプリで開発用QRコードをスキャン",
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
