/**
 * Next.js Full-Stack Admin テンプレートジェネレーター
 */

import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execa } from "execa";
import { getMessages } from "../../../i18n.js";
import {
    createEncryptionPrompt,
    runEnvEncryption,
    shouldEncryptEnv,
} from "../../../utils/env-encryption/index.js";
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
    "3. 開発サーバーを起動してください (pnpm dev)",
    "4. 管理者アカウントでログインし、各管理画面の動作を確認してください",
];

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50);
}

/**
 * Blob環境変数の置換を構築する
 * @param blobConfig Blob設定
 * @param target 置換対象のオブジェクト
 */
function buildBlobEnvReplacements(
    blobConfig?: GenerationContext["blobConfig"],
    _target?: Record<string, string>
): (envTarget: Record<string, string>) => void {
    return (envTarget: Record<string, string>) => {
        if (!blobConfig?.enabled) {
            // Blob機能が無効化されている場合は空文字で置換
            const emptyEntries: [string, string][] = [
                ["{{LOCAL_BLOB_READ_WRITE_TOKEN}}", ""],
                ["{{LOCAL_BLOB_STORE_ID}}", ""],
                ["{{LOCAL_BLOB_BASE_URL}}", ""],
                ["{{LOCAL_BLOB_TOKEN_ID}}", ""],
                ["{{LOCAL_BLOB_TOKEN_SCOPE}}", ""],
                ["{{DEV_BLOB_READ_WRITE_TOKEN}}", ""],
                ["{{DEV_BLOB_STORE_ID}}", ""],
                ["{{DEV_BLOB_BASE_URL}}", ""],
                ["{{DEV_BLOB_TOKEN_ID}}", ""],
                ["{{DEV_BLOB_TOKEN_SCOPE}}", ""],
                ["{{STAGING_BLOB_READ_WRITE_TOKEN}}", ""],
                ["{{STAGING_BLOB_STORE_ID}}", ""],
                ["{{STAGING_BLOB_BASE_URL}}", ""],
                ["{{STAGING_BLOB_TOKEN_ID}}", ""],
                ["{{STAGING_BLOB_TOKEN_SCOPE}}", ""],
                ["{{PROD_BLOB_READ_WRITE_TOKEN}}", ""],
                ["{{PROD_BLOB_STORE_ID}}", ""],
                ["{{PROD_BLOB_BASE_URL}}", ""],
                ["{{PROD_BLOB_TOKEN_ID}}", ""],
                ["{{PROD_BLOB_TOKEN_SCOPE}}", ""],
            ];

            for (const [key, value] of emptyEntries) {
                envTarget[key] = value;
            }
            return;
        }

        // Blob機能が有効な場合の値設定
        const tokenValue = blobConfig.token || "";
        const storeIdValue = blobConfig.storeId || "";
        const storeUrlValue = blobConfig.storeUrl || "";
        const tokenIdValue = blobConfig.tokenId || "";
        const tokenScopeValue = blobConfig.tokenScope || "";

        // 安全性のために、機密情報が未設定の場合は警告を表示
        if (!tokenValue) {
            console.warn(
                "⚠️ Blob設定が有効ですが、トークンが設定されていません"
            );
        }

        const entries: [string, string][] = [
            ["{{LOCAL_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{LOCAL_BLOB_STORE_ID}}", storeIdValue],
            ["{{LOCAL_BLOB_BASE_URL}}", storeUrlValue],
            ["{{LOCAL_BLOB_TOKEN_ID}}", tokenIdValue],
            ["{{LOCAL_BLOB_TOKEN_SCOPE}}", tokenScopeValue],
            ["{{DEV_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{DEV_BLOB_STORE_ID}}", storeIdValue],
            ["{{DEV_BLOB_BASE_URL}}", storeUrlValue],
            ["{{DEV_BLOB_TOKEN_ID}}", tokenIdValue],
            ["{{DEV_BLOB_TOKEN_SCOPE}}", tokenScopeValue],
            ["{{STAGING_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{STAGING_BLOB_STORE_ID}}", storeIdValue],
            ["{{STAGING_BLOB_BASE_URL}}", storeUrlValue],
            ["{{STAGING_BLOB_TOKEN_ID}}", tokenIdValue],
            ["{{STAGING_BLOB_TOKEN_SCOPE}}", tokenScopeValue],
            ["{{PROD_BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{PROD_BLOB_STORE_ID}}", storeIdValue],
            ["{{PROD_BLOB_BASE_URL}}", storeUrlValue],
            ["{{PROD_BLOB_TOKEN_ID}}", tokenIdValue],
            ["{{PROD_BLOB_TOKEN_SCOPE}}", tokenScopeValue],
        ];

        for (const [key, value] of entries) {
            envTarget[key] = value;
        }

        // 自動生成されたトークンの場合、デバッグ情報を出力
        if (blobConfig.isAutoGenerated) {
            console.log(
                `🔑 自動生成されたトークンを環境変数に設定します (スコープ: ${tokenScopeValue})`
            );
        }
    };
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

    const applyBlobReplacements = buildBlobEnvReplacements(blobConfig);

    if (database === "turso") {
        const fallbackUrl = (name: string) => `libsql://${name}.turso.io`;

        const localSqliteUrl = "file:../prisma/dev.db";

        const replacements: Record<string, string> = {
            "{{DATABASE_PROVIDER}}": "turso",
            "{{LOCAL_DATABASE_URL}}": localSqliteUrl,
            "{{LOCAL_DIRECT_DATABASE_URL}}": localSqliteUrl,
            "{{LOCAL_PRISMA_DATABASE_URL}}": localSqliteUrl,
            "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
            "{{LOCAL_SUPABASE_URL}}": "",
            "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}": "",
            "{{DEV_DATABASE_URL}}": localSqliteUrl,
            "{{DEV_DIRECT_DATABASE_URL}}": localSqliteUrl,
            "{{DEV_PRISMA_DATABASE_URL}}": localSqliteUrl,
            "{{DEV_TURSO_DATABASE_URL}}": "",
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
 * 環境変数暗号化を実行し、結果をnextStepsに反映
 */
async function processEnvEncryption(
    appDirectory: string,
    isMonorepo: boolean,
    nextSteps: string[]
): Promise<string[]> {
    const messages = getMessages();

    try {
        // 暗号化実行環境チェック
        const envCheck = await shouldEncryptEnv(appDirectory);

        if (!envCheck.canExecute) {
            // 実行できない場合はマニュアル手順を追加
            console.log(messages.create.envEncryption.skipped);
            console.log(`  理由: ${envCheck.reason}`);

            const manualSteps = [
                ...nextSteps,
                `🔐 環境変数暗号化: ${messages.create.envEncryption.manualCommand}`,
                `   (${envCheck.reason})`,
            ];
            return manualSteps;
        }

        // ユーザーに暗号化するかどうかを確認
        const promptResult = await createEncryptionPrompt();

        if (promptResult.cancelled) {
            // プロンプトがキャンセルされた場合
            console.log(messages.create.envEncryption.skipped);
            const cancelledSteps = [
                ...nextSteps,
                `🔐 環境変数暗号化: ${messages.create.envEncryption.manualCommand}`,
            ];
            return cancelledSteps;
        }

        if (!promptResult.shouldEncrypt) {
            // ユーザーが暗号化をスキップした場合
            console.log(messages.create.envEncryption.skipped);
            const skippedSteps = [
                ...nextSteps,
                `🔐 環境変数暗号化: ${messages.create.envEncryption.manualCommand}`,
            ];
            return skippedSteps;
        }

        // 暗号化を実行
        const encryptionResult = await runEnvEncryption(
            appDirectory,
            isMonorepo
        );

        if (encryptionResult.success && encryptionResult.zipPath) {
            // 暗号化成功
            const successSteps = [
                ...nextSteps,
                `✅ 環境変数を暗号化しました (${encryptionResult.zipPath})`,
                "📤 チームメンバーとパスワードを安全に共有してください",
            ];
            return successSteps;
        }
        // 暗号化失敗
        const failureSteps = [
            ...nextSteps,
            `❌ 暗号化に失敗しました: ${encryptionResult.error || "不明なエラー"}`,
            `🔐 手動実行: ${messages.create.envEncryption.manualCommand}`,
        ];
        return failureSteps;
    } catch (error) {
        // 予期しないエラー
        console.error(messages.create.envEncryption.failed);
        console.error(error instanceof Error ? error.message : error);

        const errorSteps = [
            ...nextSteps,
            `❌ 暗号化処理でエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            `🔐 手動実行: ${messages.create.envEncryption.manualCommand}`,
        ];
        return errorSteps;
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

        // データベースの初期化（マイグレーション + シーダー）を実行
        await initializeDatabase(targetDirectory, config.monorepo);

        // 環境変数暗号化を実行し、nextStepsを更新
        const updatedNextSteps = await processEnvEncryption(
            targetDirectory,
            config.monorepo,
            nextSteps
        );

        return {
            success: true,
            filesCreated,
            directoriesCreated,
            nextSteps: updatedNextSteps,
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

/**
 * データベースの初期化（マイグレーション + シーダー実行）
 */
async function initializeDatabase(
    targetDirectory: string,
    isMonorepo: boolean
): Promise<void> {
    console.log("🔄 データベースを初期化中...");

    try {
        if (isMonorepo) {
            // モノレポの場合は、プロジェクトルートから filterを指定して実行
            const projectPath = targetDirectory.replace(
                `${process.cwd()}/`,
                ""
            );
            await execa("pnpm", ["--filter", projectPath, "db:reset"], {
                cwd: process.cwd(),
                stdio: "inherit",
                timeout: 120_000, // 2分のタイムアウト
            });
        } else {
            // 単一リポジトリの場合は、プロジェクトディレクトリで直接実行
            await execa("pnpm", ["db:reset"], {
                cwd: targetDirectory,
                stdio: "inherit",
                timeout: 120_000, // 2分のタイムアウト
            });
        }

        console.log("✅ データベースの初期化が完了しました");
    } catch (error) {
        console.error("❌ データベースの初期化に失敗しました:", error);
        console.log("💡 手動でデータベースの初期化を実行してください:");
        console.log("   pnpm db:reset");

        // エラーが発生してもプロジェクト生成は継続する
        // （後で手動実行できるため）
    }
}

// EOF
