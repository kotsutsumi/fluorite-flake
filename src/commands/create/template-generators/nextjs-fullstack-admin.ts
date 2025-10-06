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

function buildEnvReplacements({
    database,
    projectName,
    credentials,
    databaseConfig,
    blobConfig,
}: {
    database: DatabaseType;
    projectName: string;
    credentials?: GenerationContext["databaseCredentials"];
    databaseConfig?: GenerationContext["databaseConfig"];
    blobConfig?: GenerationContext["blobConfig"];
}): Record<string, string> {
    const slug = slugify(projectName) || "app";
    const naming = databaseConfig?.naming ?? {
        dev: `${slug}-dev`,
        staging: `${slug}-staging`,
        prod: slug,
    };

    const applyBlobReplacements = (target: Record<string, string>) => {
        const tokenValue = blobConfig?.enabled ? blobConfig.token : "";
        const storeIdValue = blobConfig?.enabled ? blobConfig.storeId : "";

        const entries: [string, string][] = [
            ["{{LOCAL_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{LOCAL_BLOB_STORE_ID}}", storeIdValue],
            ["{{DEV_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{DEV_BLOB_STORE_ID}}", storeIdValue],
            ["{{STAGING_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{STAGING_BLOB_STORE_ID}}", storeIdValue],
            ["{{PROD_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{PROD_BLOB_STORE_ID}}", storeIdValue],
        ];

        for (const [key, value] of entries) {
            target[key] = value;
        }
    };

    if (database === "turso") {
        const fallbackUrl = (name: string) => `libsql://${name}.turso.io`;

        const replacements: Record<string, string> = {
            "{{DATABASE_PROVIDER}}": "turso",
            "{{LOCAL_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_DIRECT_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_PRISMA_DATABASE_URL}}": "file:./dev.db",
            "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
            "{{LOCAL_SUPABASE_URL}}": "",
            "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{DEV_DATABASE_URL}}": fallbackUrl(naming.dev),
            "{{DEV_DIRECT_DATABASE_URL}}": fallbackUrl(naming.dev),
            "{{DEV_PRISMA_DATABASE_URL}}": fallbackUrl(naming.dev),
            "{{DEV_TURSO_DATABASE_URL}}": fallbackUrl(naming.dev),
            "{{DEV_TURSO_AUTH_TOKEN}}": credentials?.tokens?.dev ?? "",
            "{{DEV_SUPABASE_URL}}": "",
            "{{DEV_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{STAGING_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_DIRECT_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_PRISMA_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_TURSO_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_TURSO_AUTH_TOKEN}}": credentials?.tokens?.staging ?? "",
            "{{STAGING_SUPABASE_URL}}": "",
            "{{STAGING_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{PROD_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_DIRECT_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_PRISMA_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_TURSO_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_TURSO_AUTH_TOKEN}}": credentials?.tokens?.prod ?? "",
            "{{PROD_SUPABASE_URL}}": "",
            "{{PROD_SUPABASE_SERVICE_ROLE_KEY}}": "",
        };

        const applyUrls = (env: "dev" | "staging" | "prod") => {
            const url = credentials?.urls?.[env];
            if (!url) {
                return;
            }
            const upper = env.toUpperCase();
            replacements[`{{${upper}_DATABASE_URL}}`] = url;
            replacements[`{{${upper}_DIRECT_DATABASE_URL}}`] = url;
            replacements[`{{${upper}_PRISMA_DATABASE_URL}}`] = url;
            replacements[`{{${upper}_TURSO_DATABASE_URL}}`] = url;
        };

        applyUrls("dev");
        applyUrls("staging");
        applyUrls("prod");
        applyBlobReplacements(replacements);

        return replacements;
    }

    const localUrl = "postgresql://postgres:postgres@localhost:5432/postgres";
    const serviceRolePlaceholder = "your-supabase-service-role-key";
    const supabaseHost = (name: string) => `https://${name}.supabase.co`;
    const supabaseConnection = (name: string) =>
        `postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.${name}.supabase.co:5432/postgres`;

    const replacements: Record<string, string> = {
        "{{DATABASE_PROVIDER}}": "supabase",
        "{{LOCAL_DATABASE_URL}}": localUrl,
        "{{LOCAL_DIRECT_DATABASE_URL}}": localUrl,
        "{{LOCAL_PRISMA_DATABASE_URL}}": localUrl,
        "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
        "{{LOCAL_SUPABASE_URL}}": supabaseHost(naming.dev),
        "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}":
            credentials?.tokens?.dev ?? serviceRolePlaceholder,
        "{{DEV_DATABASE_URL}}": supabaseConnection(naming.dev),
        "{{DEV_DIRECT_DATABASE_URL}}": supabaseConnection(naming.dev),
        "{{DEV_PRISMA_DATABASE_URL}}": supabaseConnection(naming.dev),
        "{{DEV_TURSO_DATABASE_URL}}": "",
        "{{DEV_TURSO_AUTH_TOKEN}}": "",
        "{{DEV_SUPABASE_URL}}": supabaseHost(naming.dev),
        "{{DEV_SUPABASE_SERVICE_ROLE_KEY}}":
            credentials?.tokens?.dev ?? serviceRolePlaceholder,
        "{{STAGING_DATABASE_URL}}": supabaseConnection(naming.staging),
        "{{STAGING_DIRECT_DATABASE_URL}}": supabaseConnection(naming.staging),
        "{{STAGING_PRISMA_DATABASE_URL}}": supabaseConnection(naming.staging),
        "{{STAGING_TURSO_DATABASE_URL}}": "",
        "{{STAGING_TURSO_AUTH_TOKEN}}": "",
        "{{STAGING_SUPABASE_URL}}": supabaseHost(naming.staging),
        "{{STAGING_SUPABASE_SERVICE_ROLE_KEY}}":
            credentials?.tokens?.staging ?? serviceRolePlaceholder,
        "{{PROD_DATABASE_URL}}": supabaseConnection(naming.prod),
        "{{PROD_DIRECT_DATABASE_URL}}": supabaseConnection(naming.prod),
        "{{PROD_PRISMA_DATABASE_URL}}": supabaseConnection(naming.prod),
        "{{PROD_TURSO_DATABASE_URL}}": "",
        "{{PROD_TURSO_AUTH_TOKEN}}": "",
        "{{PROD_SUPABASE_URL}}": supabaseHost(naming.prod),
        "{{PROD_SUPABASE_SERVICE_ROLE_KEY}}":
            credentials?.tokens?.prod ?? serviceRolePlaceholder,
    };

    const applySupabaseUrls = (env: "dev" | "staging" | "prod") => {
        const url = credentials?.urls?.[env];
        if (!url) {
            return;
        }
        const upper = env.toUpperCase();
        replacements[`{{${upper}_DATABASE_URL}}`] = url;
        replacements[`{{${upper}_DIRECT_DATABASE_URL}}`] = url;
        replacements[`{{${upper}_PRISMA_DATABASE_URL}}`] = url;
    };

    const applySupabaseTokens = (env: "dev" | "staging" | "prod") => {
        const token = credentials?.tokens?.[env];
        if (!token) {
            return;
        }
        const upper = env.toUpperCase();
        replacements[`{{${upper}_SUPABASE_SERVICE_ROLE_KEY}}`] = token;
        if (env === "dev") {
            replacements["{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}"] = token;
        }
    };

    applySupabaseUrls("dev");
    applySupabaseUrls("staging");
    applySupabaseUrls("prod");

    applySupabaseTokens("dev");
    applySupabaseTokens("staging");
    applySupabaseTokens("prod");
    applyBlobReplacements(replacements);

    return replacements;
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
    options: {
        database: DatabaseType;
        projectName: string;
        credentials?: GenerationContext["databaseCredentials"];
        databaseConfig?: GenerationContext["databaseConfig"];
        blobConfig?: GenerationContext["blobConfig"];
    }
): Promise<void> {
    const replacements = buildEnvReplacements({
        database: options.database,
        projectName: options.projectName,
        credentials: options.credentials,
        databaseConfig: options.databaseConfig,
        blobConfig: options.blobConfig,
    });

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

async function validateEnvironmentVariables(
    appDirectory: string
): Promise<boolean> {
    const envFiles = [".env", ".env.development"];
    let hasValidConfig = false;

    for (const envFile of envFiles) {
        try {
            const envPath = join(appDirectory, envFile);
            const envContent = await readFile(envPath, "utf-8");

            // DATABASE_URLまたはPRISMA_DATABASE_URLの存在チェック
            const hasDatabaseUrl =
                /(?:DATABASE_URL|PRISMA_DATABASE_URL)\s*=\s*.+/.test(
                    envContent
                );

            if (hasDatabaseUrl) {
                console.log(`✅ ${envFile} にデータベース設定が見つかりました`);
                hasValidConfig = true;
                break;
            }
        } catch (error) {
            // ファイルが存在しない場合は無視して続行
        }
    }

    if (!hasValidConfig) {
        console.warn("⚠️ 環境変数ファイルにデータベース設定が見つかりません");
        console.warn(
            "   DATABASE_URLまたはPRISMA_DATABASE_URLを設定してください"
        );
    }

    return hasValidConfig;
}

async function runSetupCommands(
    projectRoot: string,
    appDirectory: string
): Promise<void> {
    console.log("📦 依存関係をインストール中...");
    await execa("pnpm", ["install"], {
        cwd: projectRoot,
        stdio: "inherit",
    });

    console.log("🔍 環境変数の設定を確認中...");
    const hasValidEnv = await validateEnvironmentVariables(appDirectory);

    console.log("🔧 Prismaクライアントを生成中...");
    await execa("pnpm", ["db:generate"], {
        cwd: appDirectory,
        stdio: "inherit",
    });

    if (hasValidEnv) {
        console.log("🗄️ データベースのセットアップを実行中...");
        try {
            // ステップ1: データベースプッシュ
            console.log("  ステップ1: データベーススキーマをプッシュ中...");
            await execa("pnpm", ["db:push"], {
                cwd: appDirectory,
                stdio: "inherit",
            });

            // ステップ2: Prismaクライアント再生成（確実に最新にする）
            console.log("  ステップ2: Prismaクライアントを再生成中...");
            await execa("pnpm", ["db:generate"], {
                cwd: appDirectory,
                stdio: "inherit",
            });

            // ステップ3: シードデータ投入
            console.log("  ステップ3: シードデータを投入中...");
            await execa("pnpm", ["db:seed"], {
                cwd: appDirectory,
                stdio: "inherit",
            });

            console.log("✅ データベースセットアップが完了しました");
        } catch (error) {
            console.error("❌ データベースセットアップに失敗しました:");
            console.error(error instanceof Error ? error.message : error);
            console.log("🔧 手動でのセットアップ手順:");
            console.log("  1. 環境変数ファイルでデータベース接続情報を確認");
            console.log("  2. pnpm db:push を実行してテーブルを作成");
            console.log("  3. pnpm db:seed を実行してサンプルデータを投入");
        }
    } else {
        console.log(
            "⏭️ 環境変数未設定のため、データベースセットアップをスキップしました"
        );
        console.log("🔧 手動でのセットアップ手順:");
        console.log("  1. .env ファイルにデータベース接続情報を設定");
        console.log("  2. pnpm db:push を実行してテーブルを作成");
        console.log("  3. pnpm db:seed を実行してサンプルデータを投入");
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

        await configureEnvironmentFiles(targetDirectory, {
            database: config.database,
            projectName: config.name,
            credentials: context.databaseCredentials,
            databaseConfig: context.databaseConfig,
            blobConfig: context.blobConfig,
        });

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
