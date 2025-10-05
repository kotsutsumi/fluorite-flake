/**
 * Next.js Full-Stack Admin Template ジェネレーター
 */
import { join } from "node:path";
import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "nextjs-fullstack-admin";
const VARIABLE_FILES = ["package.json", "README.md", "DEPLOYMENT.md", "API.md"];
const EXECUTABLE_FILES = ["scripts/vercel-env-setup.sh"];

/**
 * Next.js フルスタック管理テンプレートをディレクトリコピーで生成
 */
export async function generateFullStackAdmin(
    context: GenerationContext
): Promise<TemplateGenerationResult> {
    const { config, targetDirectory } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [targetDirectory];
    const nextSteps = [
        "1. データベースをセットアップしてください (PostgreSQL推奨)",
        "2. 環境変数を設定してください (.env.local)",
        "3. Prismaマイグレーションを実行してください (pnpm db:migrate)",
        "4. NextAuth.jsの設定を確認してください",
        "5. 開発サーバーを起動してください (pnpm dev)",
        "6. 管理者アカウントを作成してください",
    ];

    try {
        const result = await copyTemplateDirectory({
            templateName: TEMPLATE_NAME,
            targetDirectory,
            variableFiles: VARIABLE_FILES,
            variables: { "{{PROJECT_NAME}}": config.name },
            executableFiles: EXECUTABLE_FILES,
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
