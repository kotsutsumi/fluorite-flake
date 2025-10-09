/**
 * Next.js Full-Stack Admin テンプレートジェネレーター
 */

import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, copyFile, readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execa } from "execa";
import { getMessages } from "../../../i18n.js";
import { runEnvEncryption, shouldEncryptEnv } from "../../../utils/env-encryption/index.js";
import type { createSpinnerController } from "../../../utils/spinner-control/index.js";
import { withSpinnerControl } from "../../../utils/spinner-control/index.js";
import { copyTemplateDirectory } from "../../../utils/template-manager/index.js";
import type { DatabaseType } from "../types.js";
import type { GenerationContext, TemplateGenerationResult } from "./types.js";

const TEMPLATE_NAME = "nextjs-fullstack-admin";
const VARIABLE_FILES: string[] = ["package.json"];
const EXECUTABLE_FILES: string[] = [".husky/pre-commit"];
const ENV_FILES = [".env", ".env.development", ".env.staging", ".env.prod"];
const PRISMA_SCHEMAS = {
    turso: "schema.turso.prisma",
    supabase: "schema.supabase.prisma",
    sqlite: "schema.prisma", // ローカル SQLite 用の既存スキーマを使用
} as const;

const DATABASE_SETUP_STEP: Record<DatabaseType, string> = {
    turso: "1. Tursoのデータベースを作成し、接続URLとauth tokenを .env.* に設定してください",
    supabase: "1. Supabaseプロジェクトをセットアップし、接続URLとサービスキーを .env.* に設定してください",
    sqlite: "1. ローカル SQLite データベースを初期化してください (pnpm db:reset)",
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
 * BETTER_AUTH_SECRET用の32バイトランダムシークレットを生成
 * @returns ランダムな32バイトの16進数文字列
 */
function generateAuthSecret(): string {
    return randomBytes(32).toString("hex");
}

function parseEnvContent(content: string): Record<string, string> {
    const entries: Record<string, string> = {};

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const delimiterIndex = trimmed.indexOf("=");
        if (delimiterIndex === -1) {
            continue;
        }

        const key = trimmed.slice(0, delimiterIndex).trim();
        if (!key) {
            continue;
        }

        let value = trimmed.slice(delimiterIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        entries[key] = value;
    }

    return entries;
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
                ["{{BLOB_READ_WRITE_TOKEN}}", ""],
                ["{{BLOB_STORE_ID}}", ""],
                ["{{BLOB_BASE_URL}}", ""],
                ["{{BLOB_TOKEN_ID}}", ""],
                ["{{BLOB_TOKEN_SCOPE}}", ""],
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
            console.warn("⚠️ Blob設定が有効ですが、トークンが設定されていません");
        }

        const entries: [string, string][] = [
            ["{{BLOB_READ_WRITE_TOKEN}}", tokenValue],
            ["{{BLOB_STORE_ID}}", storeIdValue],
            ["{{BLOB_BASE_URL}}", storeUrlValue],
            ["{{BLOB_TOKEN_ID}}", tokenIdValue],
            ["{{BLOB_TOKEN_SCOPE}}", tokenScopeValue],
        ];

        for (const [key, value] of entries) {
            envTarget[key] = value;
        }

        // 自動生成されたトークンの場合、デバッグ情報を出力
        if (blobConfig.isAutoGenerated) {
            console.log(`🔑 自動生成されたトークンを環境変数に設定します (スコープ: ${tokenScopeValue})`);
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

        const localSqliteUrl = "file:./prisma/dev.db";

        const replacements: Record<string, string> = {
            "{{DATABASE_PROVIDER}}": "turso",
            "{{LOCAL_DATABASE_URL}}": localSqliteUrl,
            "{{LOCAL_PRISMA_DATABASE_URL}}": localSqliteUrl,
            "{{LOCAL_TURSO_AUTH_TOKEN}}": "",
            "{{DEV_DATABASE_URL}}": credentials?.urls?.dev ?? fallbackUrl(naming.dev),
            "{{DEV_PRISMA_DATABASE_URL}}": credentials?.urls?.dev ?? fallbackUrl(naming.dev),
            "{{DEV_TURSO_DATABASE_URL}}": credentials?.urls?.dev ?? fallbackUrl(naming.dev),
            "{{DEV_TURSO_AUTH_TOKEN}}": credentials?.tokens?.dev ?? "",
            "{{STAGING_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_PRISMA_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_TURSO_DATABASE_URL}}": fallbackUrl(naming.staging),
            "{{STAGING_TURSO_AUTH_TOKEN}}": credentials?.tokens?.staging ?? "",
            "{{PROD_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_PRISMA_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_TURSO_DATABASE_URL}}": fallbackUrl(naming.prod),
            "{{PROD_TURSO_AUTH_TOKEN}}": credentials?.tokens?.prod ?? "",
        };

        const applyUrls = (env: "dev" | "staging" | "prod") => {
            const url = credentials?.urls?.[env];
            if (!url) {
                return;
            }
            const upper = env.toUpperCase();
            replacements[`{{${upper}_DATABASE_URL}}`] = url;
            replacements[`{{${upper}_PRISMA_DATABASE_URL}}`] = url;
            replacements[`{{${upper}_TURSO_DATABASE_URL}}`] = url;
        };

        applyUrls("dev");
        applyUrls("staging");
        applyUrls("prod");
        applyBlobReplacements(replacements);

        return replacements;
    }

    if (database === "supabase") {
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
            "{{LOCAL_SUPABASE_URL}}": supabaseHost(naming.dev),
            "{{LOCAL_SUPABASE_SERVICE_ROLE_KEY}}": credentials?.tokens?.dev ?? serviceRolePlaceholder,
            "{{DEV_DATABASE_URL}}": supabaseConnection(naming.dev),
            "{{DEV_DIRECT_DATABASE_URL}}": supabaseConnection(naming.dev),
            "{{DEV_PRISMA_DATABASE_URL}}": supabaseConnection(naming.dev),
            "{{DEV_SUPABASE_URL}}": supabaseHost(naming.dev),
            "{{DEV_SUPABASE_SERVICE_ROLE_KEY}}": credentials?.tokens?.dev ?? serviceRolePlaceholder,
            "{{STAGING_DATABASE_URL}}": supabaseConnection(naming.staging),
            "{{STAGING_DIRECT_DATABASE_URL}}": supabaseConnection(naming.staging),
            "{{STAGING_PRISMA_DATABASE_URL}}": supabaseConnection(naming.staging),
            "{{STAGING_SUPABASE_URL}}": supabaseHost(naming.staging),
            "{{STAGING_SUPABASE_SERVICE_ROLE_KEY}}": credentials?.tokens?.staging ?? serviceRolePlaceholder,
            "{{PROD_DATABASE_URL}}": supabaseConnection(naming.prod),
            "{{PROD_DIRECT_DATABASE_URL}}": supabaseConnection(naming.prod),
            "{{PROD_PRISMA_DATABASE_URL}}": supabaseConnection(naming.prod),
            "{{PROD_SUPABASE_URL}}": supabaseHost(naming.prod),
            "{{PROD_SUPABASE_SERVICE_ROLE_KEY}}": credentials?.tokens?.prod ?? serviceRolePlaceholder,
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

    // SQLite の場合: ローカル開発専用でプロビジョニング不要
    if (database === "sqlite") {
        // ローカルSQLiteファイルのパスを設定
        const sqliteUrl = "file:./prisma/dev.db";

        // 全ての環境変数をSQLiteファイルパスに設定し、クラウドDBの認証情報は空文字列にする
        const replacements: Record<string, string> = {
            "{{DATABASE_PROVIDER}}": "sqlite",
            "{{LOCAL_DATABASE_URL}}": sqliteUrl,
            "{{LOCAL_PRISMA_DATABASE_URL}}": sqliteUrl,
            "{{DEV_DATABASE_URL}}": sqliteUrl,
            "{{DEV_PRISMA_DATABASE_URL}}": sqliteUrl,
            "{{STAGING_DATABASE_URL}}": sqliteUrl,
            "{{STAGING_PRISMA_DATABASE_URL}}": sqliteUrl,
            "{{PROD_DATABASE_URL}}": sqliteUrl,
            "{{PROD_PRISMA_DATABASE_URL}}": sqliteUrl,
        };

        applyBlobReplacements(replacements);
        return replacements;
    }

    // デフォルト（到達しないはず）
    throw new Error(`Unsupported database type: ${database}`);
}

async function replacePlaceholders(filePath: string, replacements: Record<string, string>): Promise<void> {
    // ファイル存在確認を追加
    if (!existsSync(filePath)) {
        console.warn(`⚠️ 環境変数ファイルが見つかりません: ${filePath}`);
        return;
    }

    let content = await readFile(filePath, "utf-8");

    for (const [key, value] of Object.entries(replacements)) {
        content = content.split(key).join(value);
    }

    await writeFile(filePath, content, "utf-8");
}

/**
 * 環境変数ファイル内のBETTER_AUTH_SECRETを自動生成された値に置換
 * 既存の値が設定されている場合はスキップ
 */
async function replaceAuthSecrets(appDirectory: string): Promise<void> {
    const authSecrets = {
        local: generateAuthSecret(),
        dev: generateAuthSecret(),
        staging: generateAuthSecret(),
        prod: generateAuthSecret(),
    };

    for (const envFile of ENV_FILES) {
        const filePath = join(appDirectory, envFile);
        if (!existsSync(filePath)) {
            continue;
        }

        let content = await readFile(filePath, "utf-8");

        // change-me-* パターンの場合のみ置換（既存の値は保持）
        const replacements: Record<string, string> = {
            "change-me-local": authSecrets.local,
            "change-me-dev": authSecrets.dev,
            "change-me-staging": authSecrets.staging,
            "change-me-prod": authSecrets.prod,
        };

        let hasReplacement = false;
        for (const [placeholder, secret] of Object.entries(replacements)) {
            if (content.includes(placeholder)) {
                content = content.replace(new RegExp(placeholder, "g"), secret);
                hasReplacement = true;
            }
        }

        if (hasReplacement) {
            await writeFile(filePath, content, "utf-8");
            console.log(`🔑 ${envFile} でBETTER_AUTH_SECRETを自動生成しました`);
        }
    }
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

async function selectPrismaSchema(appDirectory: string, database: DatabaseType): Promise<void> {
    const schemaFile = PRISMA_SCHEMAS[database];
    const source = join(appDirectory, "prisma", schemaFile);
    const destination = join(appDirectory, "prisma", "schema.prisma");
    await copyFile(source, destination);
}

async function validateEnvironmentVariables(appDirectory: string): Promise<boolean> {
    const envFiles = [".env", ".env.development"];
    let hasValidConfig = false;

    for (const envFile of envFiles) {
        try {
            const envPath = join(appDirectory, envFile);
            const envContent = await readFile(envPath, "utf-8");

            // DATABASE_URLまたはPRISMA_DATABASE_URLの存在チェック
            const hasDatabaseUrl = /(?:DATABASE_URL|PRISMA_DATABASE_URL)\s*=\s*.+/.test(envContent);

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
        console.warn("   DATABASE_URLまたはPRISMA_DATABASE_URLを設定してください");
    }

    return hasValidConfig;
}

function normalizeSqliteFileUrl(appDirectory: string, rawUrl: string): string {
    const withoutScheme = rawUrl.slice("file:".length);

    if (withoutScheme.length === 0) {
        return rawUrl;
    }

    if (withoutScheme.startsWith("/") || isAbsolute(withoutScheme)) {
        return rawUrl;
    }

    const absolutePath = resolve(appDirectory, withoutScheme);
    return pathToFileURL(absolutePath).toString();
}

async function readLocalEnvVariables(appDirectory: string): Promise<Record<string, string>> {
    const envFiles = [".env.local", ".env"];
    const variables: Record<string, string> = {};

    for (const file of envFiles) {
        const filePath = join(appDirectory, file);
        if (!existsSync(filePath)) {
            continue;
        }

        const content = await readFile(filePath, "utf-8");
        const parsed = parseEnvContent(content);

        for (const [key, value] of Object.entries(parsed)) {
            variables[key] = value;
        }
    }

    return variables;
}

async function buildPrismaCommandEnv(appDirectory: string): Promise<NodeJS.ProcessEnv | undefined> {
    const envValues = await readLocalEnvVariables(appDirectory);
    const provider = (envValues.DATABASE_PROVIDER ?? "").toLowerCase();

    const candidates = [envValues.PRISMA_DATABASE_URL, envValues.DATABASE_URL, envValues.DIRECT_DATABASE_URL];

    let sqliteCandidate = candidates.find(
        (value): value is string => typeof value === "string" && value.startsWith("file:")
    );

    if (!sqliteCandidate && provider === "turso") {
        sqliteCandidate = "file:./prisma/dev.db";
    }

    if (!sqliteCandidate) {
        return;
    }

    const normalizedUrl = normalizeSqliteFileUrl(appDirectory, sqliteCandidate);

    return {
        ...process.env,
        ...envValues,
        DATABASE_URL: normalizedUrl,
        DIRECT_DATABASE_URL: normalizedUrl,
        PRISMA_DATABASE_URL: normalizedUrl,
    };
}

async function runSetupCommands(
    projectRoot: string,
    appDirectory: string,
    spinnerController?: ReturnType<typeof createSpinnerController>
): Promise<void> {
    console.log("📦 依存関係をインストール中...");

    // スピナー制御を使用してpnpmコマンドを実行
    const runPnpmCommand = async (args: string[], cwd: string, env?: NodeJS.ProcessEnv) => {
        // pnpm進捗ログとの競合を回避するため--reporter append-onlyを追加
        const pnpmArgs = args[0] === "install" ? ["install", "--reporter", "append-only", ...args.slice(1)] : args;

        if (spinnerController) {
            return withSpinnerControl(
                spinnerController,
                () =>
                    execa("pnpm", pnpmArgs, {
                        cwd,
                        stdio: "inherit",
                        env: env ?? process.env,
                    }),
                { stopOnError: true }
            );
        }
        return execa("pnpm", pnpmArgs, {
            cwd,
            stdio: "inherit",
            env: env ?? process.env,
        });
    };

    await runPnpmCommand(["install"], projectRoot);

    console.log("🔍 環境変数の設定を確認中...");
    const hasValidEnv = await validateEnvironmentVariables(appDirectory);
    const prismaCommandEnv = await buildPrismaCommandEnv(appDirectory);

    console.log("🔧 Prismaクライアントを生成中...");
    await runPnpmCommand(["db:generate"], appDirectory, prismaCommandEnv ?? process.env);

    if (hasValidEnv) {
        console.log("🗄️ データベースのセットアップを実行中...");
        try {
            // ステップ1: データベースプッシュ
            console.log("  ステップ1: データベーススキーマをプッシュ中...");
            await runPnpmCommand(["db:push"], appDirectory, prismaCommandEnv ?? process.env);

            // ステップ2: Prismaクライアント再生成（確実に最新にする）
            console.log("  ステップ2: Prismaクライアントを再生成中...");
            await runPnpmCommand(["db:generate"], appDirectory, prismaCommandEnv ?? process.env);

            // ステップ3: シードデータ投入
            console.log("  ステップ3: シードデータを投入中...");
            await runPnpmCommand(["db:seed"], appDirectory, prismaCommandEnv ?? process.env);

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
        console.log("⏭️ 環境変数未設定のため、データベースセットアップをスキップしました");
        console.log("🔧 手動でのセットアップ手順:");
        console.log("  1. .env ファイルにデータベース接続情報を設定");
        console.log("  2. pnpm db:push を実行してテーブルを作成");
        console.log("  3. pnpm db:seed を実行してサンプルデータを投入");
    }
}

/**
 * husky pre-commitスクリプトに実行権限を設定する
 */
async function setHuskyExecutePermissions(appDirectory: string): Promise<void> {
    const preCommitPath = join(appDirectory, ".husky", "pre-commit");
    if (existsSync(preCommitPath)) {
        try {
            // テスト環境では権限チェックをスキップして常にchmodを実行
            if (process.env.NODE_ENV !== "test") {
                // まず現在の権限を確認
                const stats = await stat(preCommitPath);
                const isExecutable = !!(stats.mode & 0o100); // オーナーの実行権限をチェック

                if (isExecutable) {
                    // 既に実行権限がある場合はスキップ
                    return;
                }
            }

            await chmod(preCommitPath, 0o755);
            console.log("✅ husky pre-commitスクリプトに実行権限を設定しました");
        } catch (error) {
            // エラーの場合は、実際のテスト環境では権限設定が困難な場合があるため
            // warning レベルでログ出力するが、処理は継続する
            if (process.env.NODE_ENV === "test") {
                // テスト環境では詳細なエラーログを避ける
                console.warn("⚠️ husky pre-commitスクリプトの実行権限設定に失敗しました:");
                console.warn(error instanceof Error ? error.message : String(error));
                console.warn("   手動で権限を設定してください: chmod +x .husky/pre-commit");
            }
        }
    }
}

/**
 * 環境変数暗号化を実行し、結果をnextStepsに反映
 */
async function processEnvEncryption(appDirectory: string, isMonorepo: boolean, nextSteps: string[]): Promise<string[]> {
    const messages = getMessages();

    try {
        const envCheck = await shouldEncryptEnv(appDirectory);

        if (!envCheck.canExecute) {
            console.log(messages.create.envEncryption.skipped);
            if (envCheck.reason) {
                console.log(`  理由: ${envCheck.reason}`);
            }

            return [
                ...nextSteps,
                `🔐 環境変数暗号化: ${messages.create.envEncryption.manualCommand}`,
                envCheck.reason ? `   (${envCheck.reason})` : undefined,
            ].filter(Boolean) as string[];
        }

        const encryptionResult = await runEnvEncryption(appDirectory, isMonorepo);

        if (encryptionResult.success && encryptionResult.zipPath) {
            return [
                ...nextSteps,
                `✅ 環境変数を暗号化しました (${encryptionResult.zipPath})`,
                "📤 チームメンバーとパスワードを安全に共有してください",
            ];
        }

        console.error(`❌ 暗号化に失敗しました: ${encryptionResult.error ?? "不明なエラー"}`);
        return [
            ...nextSteps,
            `❌ 暗号化に失敗しました: ${encryptionResult.error ?? "不明なエラー"}`,
            `🔐 ${messages.create.envEncryption.manualCommand}`,
        ];
    } catch (error) {
        console.error(messages.create.envEncryption.failed);
        console.error(error instanceof Error ? error.message : error);

        return [
            ...nextSteps,
            `❌ 暗号化処理でエラー: ${error instanceof Error ? error.message : "不明なエラー"}`,
            `🔐 ${messages.create.envEncryption.manualCommand}`,
        ];
    }
}

/**
 * Next.js フルスタック管理テンプレートをディレクトリコピーで生成
 */
export async function generateFullStackAdmin(
    context: GenerationContext,
    spinnerController?: ReturnType<typeof createSpinnerController>
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
            errors: ["Next.js フルスタック管理テンプレートではデータベースの選択が必須です"],
        };
    }

    const nextSteps = [DATABASE_SETUP_STEP[config.database], ...SHARED_NEXT_STEPS];

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
        directoriesCreated.push(...result.directories.map((relativePath) => join(targetDirectory, relativePath)));

        await configureEnvironmentFiles(targetDirectory, {
            database: config.database,
            projectName: config.name,
            credentials: context.databaseCredentials,
            databaseConfig: context.databaseConfig,
            blobConfig: context.blobConfig,
        });

        // BETTER_AUTH_SECRET自動生成（configureEnvironmentFiles後に実行）
        await replaceAuthSecrets(targetDirectory);

        await selectPrismaSchema(targetDirectory, config.database);

        const projectRoot = config.monorepo ? config.directory : targetDirectory;
        await runSetupCommands(projectRoot, targetDirectory, spinnerController);

        // husky pre-commitスクリプトに実行権限を設定（確実にするため）
        await setHuskyExecutePermissions(targetDirectory);

        // データベースの初期化（マイグレーション + シーダー）を実行
        // runSetupCommands内で実行されるため、重複を避けるためにコメントアウト
        // await initializeDatabase(targetDirectory, config.monorepo);

        // 環境変数暗号化を実行し、nextStepsを更新
        const updatedNextSteps = await processEnvEncryption(targetDirectory, config.monorepo, nextSteps);

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

// EOF
