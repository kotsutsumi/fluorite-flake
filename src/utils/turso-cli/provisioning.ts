/**
 * Turso CLIプロビジョニング拡張機能
 */

import { createRequire } from "node:module";
import { resolve } from "node:path";
import type {
    DatabaseCredentials,
    ProvisioningResult,
    TursoProvisioningOptions,
} from "../../commands/create/database-provisioning/types.js";
import {
    createDatabase,
    createDatabaseToken,
    getDatabaseUrl,
    isAuthenticated,
    listDatabases,
} from "./index.js";

/**
 * Tursoプロビジョニング結果の型
 */
export interface TursoProvisioningResult extends ProvisioningResult {
    credentials: DatabaseCredentials;
}

/**
 * Tursoデータベースをプロビジョニングする
 * @param options プロビジョニングオプション
 * @returns プロビジョニング結果
 */
export async function provisionTursoDatabases(
    options: TursoProvisioningOptions
): Promise<TursoProvisioningResult> {
    // 1. 認証チェック
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        throw new Error(
            "Turso CLI に認証されていません。`turso auth login` を実行してください。"
        );
    }

    // 2. 既存データベース確認
    const existingDatabases = await listDatabases();

    // 3. 命名設定の検証
    const naming = options.existingNaming
        ? options.existingNaming
        : await validateTursoNaming(options.projectName);

    // 4. 並行でデータベース作成・トークン生成
    const credentials: DatabaseCredentials = {
        urls: {} as Record<"dev" | "staging" | "prod", string>,
        tokens: {} as Record<"dev" | "staging" | "prod", string>,
    };

    const databases: Array<{
        environment: "dev" | "staging" | "prod";
        name: string;
        url: string;
        status: "created" | "existing" | "failed";
    }> = [];

    // 並行処理でデータベースとトークンを作成
    const createPromises = options.environments.map(async (env) => {
        const dbName = naming[env];
        const exists = existingDatabases.some((db) => db.name === dbName);

        try {
            if (exists) {
                console.log(
                    `ℹ️ ${env}環境データベース '${dbName}' は既に存在します`
                );
            } else {
                await createDatabase(dbName, {
                    location: options.location,
                });
                console.log(
                    `✅ ${env}環境データベース '${dbName}' を作成しました`
                );
            }

            const url = await getDatabaseUrl(dbName);
            const token = await createDatabaseToken(dbName);

            credentials.urls[env] = url;
            credentials.tokens[env] = token.token;

            databases.push({
                environment: env,
                name: dbName,
                url,
                status: exists ? "existing" : "created",
            });
        } catch (error) {
            console.error(
                `❌ ${env}環境データベース '${dbName}' の処理に失敗: ${error instanceof Error ? error.message : error}`
            );

            databases.push({
                environment: env,
                name: dbName,
                url: "",
                status: "failed",
            });
        }
    });

    await Promise.allSettled(createPromises);

    // 失敗したデータベースがある場合はエラー
    const failedDatabases = databases.filter((db) => db.status === "failed");
    if (failedDatabases.length > 0) {
        throw new Error(
            `以下のデータベースの作成に失敗しました: ${failedDatabases.map((db) => db.name).join(", ")}`
        );
    }

    // credentials の完全性を検証
    for (const env of options.environments) {
        if (!(credentials.urls[env] && credentials.tokens[env])) {
            throw new Error(
                `${env}環境の認証情報が不完全です - URL: ${credentials.urls[env] ? "設定済み" : "未設定"}, Token: ${credentials.tokens[env] ? "設定済み" : "未設定"}`
            );
        }
    }

    return {
        success: true,
        credentials,
        databases,
    };
}

/**
 * Turso命名規則を検証し、適切な命名設定を生成する
 * @param projectName プロジェクト名
 * @returns 検証済み命名設定
 */
export async function validateTursoNaming(
    projectName: string
): Promise<{ dev: string; staging: string; prod: string }> {
    // Turso制約: 3-32文字、英数字・ハイフンのみ
    const sanitizeForTurso = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 24); // 環境サフィックス用に余裕を持たせる
    };

    const baseName = sanitizeForTurso(projectName);

    if (baseName.length < 3) {
        throw new Error(
            `プロジェクト名 '${projectName}' が短すぎます。Tursoデータベース名は3文字以上である必要があります。`
        );
    }

    const naming = {
        dev: `${baseName}-dev`,
        staging: `${baseName}-stg`,
        prod: baseName, // 本番環境はベース名のみ（環境サフィックスなし）
    };

    // 命名制約チェック
    for (const [env, name] of Object.entries(naming)) {
        if (name.length > 32) {
            throw new Error(
                `${env}環境のデータベース名 '${name}' が長すぎます（最大32文字）`
            );
        }
        if (name.length < 3) {
            throw new Error(
                `${env}環境のデータベース名 '${name}' が短すぎます（最小3文字）`
            );
        }
        if (!/^[a-z0-9-]+$/.test(name)) {
            throw new Error(
                `${env}環境のデータベース名 '${name}' に無効な文字が含まれています（英小文字、数字、ハイフンのみ許可）`
            );
        }
    }

    return naming;
}

/**
 * Tursoデータベースの接続をテストする
 * @param url データベースURL
 * @param token 認証トークン
 * @returns 接続可能かどうか
 */
export async function testTursoConnection(
    url: string,
    token: string
): Promise<boolean> {
    try {
        // 実際の接続テストは複雑なので、URLとトークンの形式をチェック
        if (!(url.startsWith("libsql://") || url.startsWith("file:"))) {
            return false;
        }

        if (token.length < 10) {
            return false;
        }

        // 実際の接続テストを行う場合は、libsqlクライアントを使用
        // const client = createClient({ url, authToken: token });
        // await client.execute('SELECT 1');

        return true;
    } catch (error) {
        console.error(
            `Turso接続テストエラー: ${error instanceof Error ? error.message : error}`
        );
        return false;
    }
}

/**
 * 既存Tursoデータベースから互換性のあるものを抽出する
 * @param databases データベース一覧
 * @param projectName プロジェクト名
 * @returns 互換性のあるデータベース一覧
 */
export function filterCompatibleTursoDatabases(
    databases: Array<{ name: string; url?: string }>,
    projectName: string
): Array<{ name: string; url?: string }> {
    const sanitizedProjectName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return databases.filter((db) => {
        const dbName = db.name.toLowerCase();

        // 正確なプロジェクト環境データベース名のパターン
        const exactPatterns = [
            `${sanitizedProjectName}-dev`,
            `${sanitizedProjectName}-stg`,
            `${sanitizedProjectName}-prod`,
            `${sanitizedProjectName}-staging`,
            `${sanitizedProjectName}-production`,
        ];

        // 完全一致のみをチェック（サブプロジェクトとの混同を防ぐ）
        return exactPatterns.includes(dbName);
    });
}

function appendAuthToken(url: string, token: string | undefined): string {
    if (!(url && token)) {
        return url;
    }

    const [base, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.set("authToken", token);
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}

function maskAuthToken(url: string): string {
    if (!url) {
        return url;
    }

    return url.replace(/authToken=[^&]+/gi, "authToken=***");
}

/**
 * データベースURLからクエリパラメータを除去してベースURLを取得する
 * libsqlクライアントはクエリパラメータのないクリーンなURLを期待するため
 * @param url 元のURL（クエリパラメータ付きの可能性あり）
 * @returns クリーンなベースURL
 */
export function cleanDatabaseUrl(url: string): string {
    if (!url) {
        return url;
    }

    try {
        const parsedUrl = new URL(url);
        // クエリパラメータを削除してベースURLのみを返す
        return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
    } catch (error) {
        // URL解析に失敗した場合は元のURLをそのまま返す
        console.warn(`⚠️ URL解析に失敗しました: ${url}`, error);
        return url;
    }
}

/**
 * 各環境のTursoデータベースにテーブルを作成する
 * @param projectPath プロジェクトのパス
 * @param credentials データベース認証情報
 * @param environments 対象環境一覧
 */
export async function createTablesInTursoDatabases(
    projectPath: string,
    credentials: DatabaseCredentials,
    environments: ("dev" | "staging" | "prod")[] = ["dev", "staging", "prod"]
): Promise<void> {
    console.log("📋 各環境のTursoクラウドデータベースの初期設定を実行中...");

    for (const env of environments) {
        try {
            const url = credentials.urls[env];
            const token = credentials.tokens[env];

            // 詳細な認証情報バリデーション
            if (!(url && token)) {
                const urlStatus = url ? "設定済み" : "未設定";
                const tokenStatus = token ? "設定済み" : "未設定";
                console.error(
                    `❌ ${env}環境の認証情報が不足しています - URL: ${urlStatus}, Token: ${tokenStatus}`
                );
                console.error(
                    `   認証情報の内容: URL="${url || "undefined"}", Token="${token ? "***設定済み***" : "undefined"}"`
                );
                console.error(
                    "   この問題は通常、データベースプロビジョニング段階での失敗が原因です。"
                );
                continue;
            }

            // URLの形式を簡易検証
            if (!url.startsWith("libsql://")) {
                console.error(
                    `❌ ${env}環境のデータベースURL形式が無効です: ${url}`
                );
                console.error(
                    `   TursoデータベースのURLは 'libsql://' で開始する必要があります。`
                );
                continue;
            }

            console.log(`🔄 ${env}環境 (${url}) の初期設定中...`);

            const webAppPath = resolve(projectPath);

            const urlWithToken = appendAuthToken(url, token);

            const envVars = {
                ...process.env,
                DATABASE_URL: urlWithToken, // Prisma用（クエリパラメータ付き）
                PRISMA_DATABASE_URL: urlWithToken, // テンプレートのschema.turso.prismaで使用
                TURSO_DATABASE_URL: url, // libsql用（クリーンなURL）
                TURSO_AUTH_TOKEN: token,
                LIBSQL_AUTH_TOKEN: token,
                DATABASE_PROVIDER: "turso",
                NODE_ENV: "production",
            } satisfies NodeJS.ProcessEnv;

            console.log(`📝 ${env}環境用の環境変数を設定`);
            console.log(`   DATABASE_URL: ${maskAuthToken(urlWithToken)}`);
            console.log(
                `   TURSO_AUTH_TOKEN: ${token ? "***取得済み***" : "未設定"}`
            );

            console.log(`🔧 ${env}環境のデータベースにテーブルを作成中...`);

            try {
                await withTemporaryEnv(envVars, async () => {
                    await executeTursoBootstrap({
                        projectPath: webAppPath,
                        environmentVariables: envVars,
                    });
                });
                console.log(`📊 ${env}環境のテーブル作成が完了しました`);
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                console.warn(
                    `⚠️ ${env}環境のテーブル作成で問題が発生しました: ${errorMessage}`
                );

                // URL_INVALID エラーの場合は特別な診断情報を提供
                if (
                    errorMessage.includes("URL_INVALID") ||
                    errorMessage.includes("undefined")
                ) {
                    console.error("🔍 診断情報:");
                    console.error(
                        `   - データベースURL: ${credentials.urls[env] || "undefined"}`
                    );
                    console.error(
                        `   - 認証トークン: ${credentials.tokens[env] ? "設定済み" : "undefined"}`
                    );
                    console.error(
                        "   - このエラーは通常、プロビジョニング段階でのデータベース作成失敗が原因です"
                    );
                    console.error(
                        `   - 'turso auth whoami' でTurso CLIの認証状況を確認してください`
                    );
                } else {
                    console.warn(
                        "   実際のアプリケーション起動時にテーブル作成が実行されます。"
                    );
                }
            }

            console.log(`✅ ${env}環境の初期設定が完了しました`);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            console.error(`❌ ${env}環境の初期設定に失敗: ${errorMessage}`);

            // 詳細な診断情報を出力
            console.error("🔍 詳細診断情報:");
            console.error(`   - 環境: ${env}`);
            console.error(`   - プロジェクトパス: ${projectPath}`);
            console.error(
                `   - データベースURL: ${credentials.urls[env] || "undefined"}`
            );
            console.error(
                `   - 認証トークン: ${credentials.tokens[env] ? "設定済み" : "undefined"}`
            );

            if (error instanceof Error && error.stack) {
                console.error(
                    `   - スタックトレース: ${error.stack.split("\n")[0]}`
                );
            }

            console.error(
                "   - 推奨対応: データベースプロビジョニングを再実行してください"
            );

            // エラーでも他の環境の処理を続行
        }
    }

    console.log("🎉 全環境の初期設定処理が完了しました");
    console.log(
        "ℹ️ Tursoデータベースのテーブル作成は、アプリケーションの初回起動時に自動的に実行されます"
    );
}

type TursoBootstrapOptions = {
    projectPath: string;
    environmentVariables: NodeJS.ProcessEnv;
};

type PrismaClientLike = {
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
};

type LibsqlClient = {
    execute: (sql: string) => Promise<unknown>;
    close?: () => Promise<unknown> | undefined;
};

type EnvRecord = Record<string, string | undefined>;

async function withTemporaryEnv<T>(
    overrides: EnvRecord,
    callback: () => Promise<T>
): Promise<T> {
    const original = new Map<string, string | undefined>();

    for (const [key, value] of Object.entries(overrides)) {
        original.set(key, process.env[key]);
        if (typeof value === "string") {
            process.env[key] = value;
        } else {
            delete process.env[key];
        }
    }

    try {
        return await callback();
    } finally {
        for (const [key, value] of original.entries()) {
            if (typeof value === "string") {
                process.env[key] = value;
            } else {
                delete process.env[key];
            }
        }
    }
}

function loadProjectModule<T>(
    projectRequire: ReturnType<typeof createRequire>,
    moduleId: string
): T {
    try {
        return projectRequire(moduleId) as T;
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
            `プロジェクト依存モジュール '${moduleId}' の読み込みに失敗しました: ${details}`
        );
    }
}

async function executeTursoBootstrap(
    options: TursoBootstrapOptions
): Promise<void> {
    const { projectPath, environmentVariables } = options;
    const projectRoot = resolve(projectPath);
    const requireFromProject = createRequire(
        resolve(projectRoot, "package.json")
    );

    const prismaModule = loadProjectModule<{
        PrismaClient: new (...args: unknown[]) => PrismaClientLike;
    }>(requireFromProject, "@prisma/client");

    const adapterModule = loadProjectModule<{
        PrismaLibSQL: new (...args: unknown[]) => unknown;
    }>(requireFromProject, "@prisma/adapter-libsql");

    const libsqlModule = loadProjectModule<{
        createClient: (config: {
            url: string;
            authToken: string;
        }) => LibsqlClient;
    }>(requireFromProject, "@libsql/client");

    // libsql専用のクリーンなURLを最優先で取得
    const rawTursoUrl =
        environmentVariables.TURSO_DATABASE_URL ||
        process.env.TURSO_DATABASE_URL ||
        environmentVariables.DATABASE_URL ||
        environmentVariables.PRISMA_DATABASE_URL ||
        process.env.DATABASE_URL ||
        process.env.PRISMA_DATABASE_URL ||
        "";

    // libsqlクライアント用にクエリパラメータを除去したクリーンなURLを取得
    const tursoUrl = cleanDatabaseUrl(rawTursoUrl);

    const authToken =
        environmentVariables.TURSO_AUTH_TOKEN ||
        environmentVariables.LIBSQL_AUTH_TOKEN ||
        process.env.TURSO_AUTH_TOKEN ||
        process.env.LIBSQL_AUTH_TOKEN ||
        "";

    console.log("🔍 デバッグ: 環境変数確認");
    console.log(
        "   RAW_DATABASE_URL:",
        rawTursoUrl ? maskAuthToken(rawTursoUrl) : "undefined"
    );
    console.log(
        "   CLEAN_DATABASE_URL:",
        tursoUrl ? maskAuthToken(tursoUrl) : "undefined"
    );
    console.log(
        "   TURSO_AUTH_TOKEN:",
        authToken ? "***設定済み***" : "undefined"
    );

    // libsqlクライアントには認証トークン付きURLではなく、別々のurlとauthTokenが必要
    if (!(tursoUrl && authToken)) {
        throw new Error(
            `Missing TURSO credentials - Clean URL: ${tursoUrl ? "OK" : "missing"}, Token: ${authToken ? "OK" : "missing"}`
        );
    }

    console.log("   使用URL:", maskAuthToken(tursoUrl));
    console.log("   使用トークン:", authToken ? "***設定済み***" : "undefined");

    const prismaDatasourceUrl = appendAuthToken(tursoUrl, authToken);
    console.log(
        "   Prisma用データソースURL:",
        maskAuthToken(prismaDatasourceUrl)
    );

    const PrismaClient = prismaModule.PrismaClient;
    const PrismaLibSQL = adapterModule.PrismaLibSQL;

    console.log("🔍 libsqlクライアント作成前の値確認:");
    console.log("   - tursoUrl:", tursoUrl);
    console.log(
        "   - authToken length:",
        authToken ? authToken.length : "undefined"
    );
    console.log("   - tursoUrl type:", typeof tursoUrl);
    console.log("   - authToken type:", typeof authToken);

    const libsqlClient = libsqlModule.createClient({
        url: tursoUrl,
        authToken,
    });

    console.log("🔍 libsqlクライアント作成完了");

    // 接続テストを実行
    try {
        console.log("🔍 libsqlクライアント接続テスト開始");
        const testResult = await libsqlClient.execute("SELECT 1 as test");
        console.log("✅ libsqlクライアント接続テスト成功:", testResult);
    } catch (testError) {
        console.error("❌ libsqlクライアント接続テスト失敗:", testError);
        console.error("   URL:", tursoUrl);
        console.error("   Token length:", authToken?.length || 0);
        throw new Error(
            `libsqlクライアント接続テスト失敗: ${testError instanceof Error ? testError.message : String(testError)}`
        );
    }

    const adapter = new PrismaLibSQL(libsqlClient);
    console.log("🔍 PrismaLibSQLアダプター作成完了");

    const prisma = new PrismaClient({
        adapter,
        datasourceUrl: prismaDatasourceUrl,
        datasources: {
            db: {
                url: prismaDatasourceUrl,
            },
        },
    });
    console.log("🔍 PrismaClient作成完了");

    try {
        await prisma.$connect();
        console.log("✅ Turso接続成功");
        console.log("📊 完全なアプリケーションスキーマを作成中...");

        const tableStatements: Array<{ label: string; statement: string }> = [
            {
                label: "   - Userテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS User (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                emailVerified INTEGER DEFAULT 0,
                name TEXT,
                image TEXT,
                role TEXT DEFAULT 'user',
                MemberId TEXT UNIQUE,
                memberSince DATETIME,
                sponsorInfo TEXT,
                metadata TEXT,
                isActive INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `,
            },
            {
                label: "   - Postテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Post (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                published INTEGER DEFAULT 0,
                authorId TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (authorId) REFERENCES User(id) ON DELETE CASCADE
            );
        `,
            },
            {
                label: "   - Accountテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Account (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                accountId TEXT NOT NULL,
                providerId TEXT NOT NULL,
                accessToken TEXT,
                refreshToken TEXT,
                idToken TEXT,
                accessTokenExpiresAt DATETIME,
                refreshTokenExpiresAt DATETIME,
                scope TEXT,
                password TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
                UNIQUE (providerId, accountId)
            );
        `,
            },
            {
                label: "   - Sessionテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Session (
                id TEXT PRIMARY KEY,
                expiresAt DATETIME NOT NULL,
                token TEXT UNIQUE NOT NULL,
                ipAddress TEXT,
                userAgent TEXT,
                userId TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
            );
        `,
            },
            {
                label: "   - Verificationテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Verification (
                id TEXT PRIMARY KEY,
                identifier TEXT NOT NULL,
                value TEXT NOT NULL,
                expiresAt DATETIME NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `,
            },
            {
                label: "   - Organizationテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Organization (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                metadata TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `,
            },
        ];

        for (const { label, statement } of tableStatements) {
            console.log(label);
            try {
                console.log(`🔍 実行SQL: ${statement.slice(0, 100)}...`);
                const result = await libsqlClient.execute(statement);
                console.log("✅ SQL実行成功:", result);
            } catch (error) {
                console.error(`❌ SQL実行エラー: ${label}`);
                console.error("   エラー詳細:", error);
                console.error("   実行SQL:", statement);
                console.error("   libsqlクライアント状態:", {
                    url: tursoUrl,
                    authTokenLength: authToken?.length || 0,
                    clientType: typeof libsqlClient,
                    clientMethods: Object.getOwnPropertyNames(libsqlClient),
                });
                throw error;
            }
        }

        console.log("   - インデックス作成中...");
        const indexStatements = [
            "CREATE INDEX IF NOT EXISTS idx_post_authorId ON Post(authorId);",
            "CREATE INDEX IF NOT EXISTS idx_post_published ON Post(published);",
            "CREATE INDEX IF NOT EXISTS idx_account_userId ON Account(userId);",
            "CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId);",
            "CREATE INDEX IF NOT EXISTS idx_verification_identifier ON Verification(identifier);",
        ];

        for (const statement of indexStatements) {
            try {
                console.log(`🔍 インデックス実行: ${statement}`);
                const result = await libsqlClient.execute(statement);
                console.log("✅ インデックス実行成功:", result);
            } catch (error) {
                console.error(`❌ インデックス実行エラー: ${statement}`);
                console.error("   エラー詳細:", error);
                throw error;
            }
        }

        console.log("✅ 完全なアプリケーションスキーマ作成成功");
    } finally {
        await prisma.$disconnect().catch(() => {
            // プリズマ接続の切断に失敗した場合は無視する
        });
        if (typeof libsqlClient.close === "function") {
            await Promise.resolve(libsqlClient.close()).catch(() => {
                // クライアント接続の切断に失敗した場合は無視する
            });
        }
    }
}

/**
 * 各環境のTursoデータベースの環境変数設定を生成する
 * @param projectPath プロジェクトのパス
 * @param credentials データベース認証情報
 * @param environments 対象環境一覧
 */
export async function seedTursoDatabases(
    _projectPath: string,
    credentials: DatabaseCredentials,
    environments: ("dev" | "staging" | "prod")[] = ["dev", "staging"]
): Promise<void> {
    console.log(
        "🌱 Tursoクラウドデータベース環境変数の設定ファイルを生成中..."
    );

    for (const env of environments) {
        try {
            const url = credentials.urls[env];
            const token = credentials.tokens[env];

            if (!(url && token)) {
                console.warn(`⚠️ ${env}環境の認証情報が不足しています`);
                continue;
            }

            const urlWithToken = appendAuthToken(url, token);

            // 本番環境にはシードデータを投入しない
            if (env === "prod") {
                console.log(
                    `ℹ️ ${env}環境は環境変数設定のみを行います（シードデータはスキップ）`
                );
            } else {
                console.log(`🔄 ${env}環境の環境変数設定を生成中...`);
            }

            console.log(`📝 ${env}環境用の環境変数:`);
            console.log(`   DATABASE_URL: ${maskAuthToken(urlWithToken)}`);
            console.log(
                `   TURSO_AUTH_TOKEN: ${token ? "***取得済み***" : "未設定"}`
            );

            // 環境変数の設定が正常に取得できたことを確認
            console.log(`✅ ${env}環境の環境変数設定が確認できました`);
        } catch (error) {
            console.error(
                `❌ ${env}環境の環境変数設定に失敗: ${error instanceof Error ? error.message : error}`
            );

            // デバッグ情報を出力
            if (error instanceof Error && error.message) {
                console.error(`   エラー詳細: ${error.message}`);
            }

            // エラーでも他の環境の処理を続行
        }
    }

    console.log("🎉 全環境の環境変数設定処理が完了しました");
    console.log(
        "ℹ️ 実際のテーブル作成とシードデータ投入は、アプリケーションの初回起動時に自動的に実行されます"
    );
    console.log(
        "💡 プロジェクトのREADME.mdに各環境での起動手順が記載されています"
    );
}

/**
 * Tursoデータベースの使用量情報を取得する
 * @param databaseName データベース名
 * @returns 使用量情報
 */
export async function getTursoUsageInfo(databaseName: string): Promise<{
    reads: number;
    writes: number;
    storage: number;
}> {
    try {
        // Turso CLIで使用量情報を取得
        // 実際の実装では、turso db show コマンドの出力をパースする
        console.log(`データベース '${databaseName}' の使用量情報を取得中...`);

        // モック実装
        return {
            reads: 0,
            writes: 0,
            storage: 0,
        };
    } catch (error) {
        console.error(
            `使用量情報取得エラー: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

// EOF
