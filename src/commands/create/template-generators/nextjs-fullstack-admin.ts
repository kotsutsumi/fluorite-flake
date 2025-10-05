/**
 * Next.js Full-Stack Admin テンプレートジェネレーター
 */
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { execa } from "execa";

import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { DatabaseType } from "../types.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "nextjs-fullstack-admin";
const VARIABLE_FILES: string[] = ["package.json"];
const EXECUTABLE_FILES: string[] = [];
const ENV_FILES = [".env", ".env.development", ".env.staging", ".env.prod"];
const PRISMA_SCHEMAS = {
    turso: "schema.turso.prisma",
    supabase: "schema.supabase.prisma",
} as const;

const DATABASE_SETUP_STEP: Record<DatabaseType, string> = {
    turso: "1. Tursoのデータベースを作成し、接続URLとauth tokenを .env.* に設定してください",
    supabase:
        "1. Supabaseプロジェクトをセットアップし、接続URLとサービスキーを .env.* に設定してください",
};

const SHARED_NEXT_STEPS = [
    "2. .env ファイル内のプレースホルダーを実際の値に置き換えてください",
    "3. Prisma マイグレーションを実行してください (pnpm db:migrate)",
    "4. 開発サーバーを起動してください (pnpm dev)",
    "5. 管理者アカウントでログインし、各管理画面の動作を確認してください",
];

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}

function buildEnvReplacements(
    database: DatabaseType,
    projectName: string
): Record<string, string> {
    const slug = slugify(projectName) || "app";

    if (database === "turso") {
        const stagingUrl = `libsql://${slug}-staging.turso.io`;
        const prodUrl = `libsql://${slug}.turso.io`;

        return {
            "{{DATABASE_PROVIDER}}": "turso",
            "{{LOCAL_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_DIRECT_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_PRISMA_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
            "{{LOCAL_SUPABASE_URL}}": "",
            "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{DEV_DATABASE_URL}}": "file:./dev.db",
            "{{DEV_DIRECT_DATABASE_URL}}": "file:./dev.db",
            "{{DEV_PRISMA_DATABASE_URL}}": "file:./dev.db",
            "{{DEV_TURSO_DATABASE_URL}}": "",
            "{{DEV_TURSO_AUTH_TOKEN}}": "",
            "{{DEV_SUPABASE_URL}}": "",
            "{{DEV_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{STAGING_DATABASE_URL}}": stagingUrl,
            "{{STAGING_DIRECT_DATABASE_URL}}": stagingUrl,
            "{{STAGING_PRISMA_DATABASE_URL}}": "file:./dev.db",
            "{{STAGING_TURSO_DATABASE_URL}}": stagingUrl,
            "{{STAGING_TURSO_AUTH_TOKEN}}": "",
            "{{STAGING_SUPABASE_URL}}": "",
            "{{STAGING_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{PROD_DATABASE_URL}}": prodUrl,
            "{{PROD_DIRECT_DATABASE_URL}}": prodUrl,
            "{{PROD_PRISMA_DATABASE_URL}}": "file:./dev.db",
            "{{PROD_TURSO_DATABASE_URL}}": prodUrl,
            "{{PROD_TURSO_AUTH_TOKEN}}": "",
            "{{PROD_SUPABASE_URL}}": "",
            "{{PROD_SUPABASE_SERVICE_ROLE_KEY}}": "",
        };
    }

    const supabaseHost = `https://${slug}.supabase.co`;
    const localUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
    const remotePlaceholder =
        "postgresql://YOUR_SUPABASE_USER:YOUR_SUPABASE_PASSWORD@YOUR_SUPABASE_HOST:5432/postgres";
    const serviceRolePlaceholder = "your-supabase-service-role-key";

    return {
        "{{DATABASE_PROVIDER}}": "supabase",
        "{{LOCAL_DATABASE_URL}}": localUrl,
        "{{LOCAL_DIRECT_DATABASE_URL}}": localUrl,
        "{{LOCAL_PRISMA_DATABASE_URL}}": localUrl,
        "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
        "{{LOCAL_SUPABASE_URL}}": supabaseHost,
        "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}": serviceRolePlaceholder,
        "{{DEV_DATABASE_URL}}": remotePlaceholder,
        "{{DEV_DIRECT_DATABASE_URL}}": remotePlaceholder,
        "{{DEV_PRISMA_DATABASE_URL}}": remotePlaceholder,
        "{{DEV_TURSO_DATABASE_URL}}": "",
        "{{DEV_TURSO_AUTH_TOKEN}}": "",
        "{{DEV_SUPABASE_URL}}": supabaseHost,
        "{{DEV_SUPABASE_SERVICE_ROLE_KEY}}": serviceRolePlaceholder,
        "{{STAGING_DATABASE_URL}}": remotePlaceholder,
        "{{STAGING_DIRECT_DATABASE_URL}}": remotePlaceholder,
        "{{STAGING_PRISMA_DATABASE_URL}}": remotePlaceholder,
        "{{STAGING_TURSO_DATABASE_URL}}": "",
        "{{STAGING_TURSO_AUTH_TOKEN}}": "",
        "{{STAGING_SUPABASE_URL}}": supabaseHost,
        "{{STAGING_SUPABASE_SERVICE_ROLE_KEY}}": serviceRolePlaceholder,
        "{{PROD_DATABASE_URL}}": remotePlaceholder,
        "{{PROD_DIRECT_DATABASE_URL}}": remotePlaceholder,
        "{{PROD_PRISMA_DATABASE_URL}}": remotePlaceholder,
        "{{PROD_TURSO_DATABASE_URL}}": "",
        "{{PROD_TURSO_AUTH_TOKEN}}": "",
        "{{PROD_SUPABASE_URL}}": supabaseHost,
        "{{PROD_SUPABASE_SERVICE_ROLE_KEY}}": serviceRolePlaceholder,
    };
}

async function replacePlaceholders(
    filePath: string,
    replacements: Record<string, string>
): Promise<void> {
    let content = await readFile(filePath, "utf-8");

    for (const [key, value] of Object.entries(replacements)) {
        content = content.split(key).join(value);
    }

    await writeFile(filePath, content, "utf-8");
}

async function configureEnvironmentFiles(
    appDirectory: string,
    database: DatabaseType,
    projectName: string
): Promise<void> {
    const replacements = buildEnvReplacements(database, projectName);

    await Promise.all(
        ENV_FILES.map(async (filename) => {
            const filePath = join(appDirectory, filename);
            await replacePlaceholders(filePath, replacements);
        })
    );
}

async function selectPrismaSchema(
    appDirectory: string,
    database: DatabaseType
): Promise<void> {
    const schemaFile = PRISMA_SCHEMAS[database];
    const source = join(appDirectory, "prisma", schemaFile);
    const destination = join(appDirectory, "prisma", "schema.prisma");
    await copyFile(source, destination);
}

async function runSetupCommands(
    projectRoot: string,
    appDirectory: string
): Promise<void> {
    await execa("pnpm", ["install"], {
        cwd: projectRoot,
        stdio: "inherit",
    });

    await execa("pnpm", ["db:generate"], {
        cwd: appDirectory,
        stdio: "inherit",
    });

    try {
        await execa("pnpm", ["db:reset"], {
            cwd: appDirectory,
            stdio: "inherit",
        });
    } catch (error) {
        console.warn(
            "⚠️ pnpm db:reset が失敗しました。環境変数の設定が完了していない可能性があるためスキップします。",
            error
        );
    }
}

/**
 * Next.js フルスタック管理テンプレートをディレクトリコピーで生成
 */
export async function generateFullStackAdmin(
    context: GenerationContext
): Promise<TemplateGenerationResult> {
    const { config, targetDirectory } = context;
    const filesCreated: string[] = [];
    const directoriesCreated: string[] = [targetDirectory];

    if (!config.database) {
        return {
            success: false,
            filesCreated,
            directoriesCreated,
            nextSteps: [],
            errors: [
                "Next.js フルスタック管理テンプレートではデータベースの選択が必須です",
            ],
        };
    }

    const nextSteps = [
        DATABASE_SETUP_STEP[config.database],
        ...SHARED_NEXT_STEPS,
    ];

    const projectSlug = slugify(config.name) || "app";
    const packageName = config.monorepo ? `${projectSlug}-web` : projectSlug;

    try {
        const result = await copyTemplateDirectory({
            templateName: TEMPLATE_NAME,
            targetDirectory,
            variableFiles: VARIABLE_FILES,
            variables: {
                "{{PROJECT_PACKAGE_NAME}}": packageName,
            },
            executableFiles: EXECUTABLE_FILES,
        });

        filesCreated.push(...result.files);
        directoriesCreated.push(
            ...result.directories.map((relativePath) =>
                join(targetDirectory, relativePath)
            )
        );

        await configureEnvironmentFiles(
            targetDirectory,
            config.database,
            config.name
        );

        await selectPrismaSchema(targetDirectory, config.database);

        const projectRoot = config.monorepo
            ? config.directory
            : targetDirectory;
        await runSetupCommands(projectRoot, targetDirectory);

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
