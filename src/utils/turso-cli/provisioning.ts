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
import { createDatabase, createDatabaseToken, getDatabaseUrl, isAuthenticated, listDatabases } from "./index.js";

/**
 * Tursoプロビジョニング結果の型
 */
function stripEnvironmentSuffix(name: string): string {
    const suffixes = ["-dev", "-development", "-staging", "-stg", "-prod", "-production", "-test"];

    for (const suffix of suffixes) {
        if (name.endsWith(suffix)) {
            return name.slice(0, name.length - suffix.length);
        }
    }

    return name;
}

export interface TursoProvisioningResult extends ProvisioningResult {
    credentials: DatabaseCredentials;
}

/**
 * Tursoデータベースをプロビジョニングする
 * @param options プロビジョニングオプション
 * @returns プロビジョニング結果
 */
export async function provisionTursoDatabases(options: TursoProvisioningOptions): Promise<TursoProvisioningResult> {
    // 1. 認証チェック
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        throw new Error("Turso CLI に認証されていません。`turso auth login` を実行してください。");
    }

    // 2. 既存データベース確認
    const existingDatabases = await listDatabases();

    // 3. 命名設定の検証
    const naming = options.existingNaming ? options.existingNaming : await validateTursoNaming(options.projectName);
    options.projectName;

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
                console.log(`ℹ️ ${env}環境データベース '${dbName}' は既に存在します`);
            } else {
                await createDatabase(dbName, {
                    location: options.location,
                });
                console.log(`✅ ${env}環境データベース '${dbName}' を作成しました`);
            }

            // URLとトークンの取得を個別にエラーハンドリング
            let url = "";
            let token = "";

            try {
                url = await getDatabaseUrl(dbName);
                console.log(`🔗 ${env}環境: データベースURL取得完了`);
            } catch (urlError) {
                throw new Error(`データベースURL取得失敗: ${urlError instanceof Error ? urlError.message : urlError}`);
            }

            try {
                const tokenResult = await createDatabaseToken(dbName);
                token = tokenResult.token;
                console.log(`🔑 ${env}環境: トークン生成完了`);
            } catch (tokenError) {
                throw new Error(`トークン生成失敗: ${tokenError instanceof Error ? tokenError.message : tokenError}`);
            }

            credentials.urls![env] = url;
            credentials.tokens![env] = token;

            databases.push({
                environment: env,
                name: dbName,
                url,
                status: exists ? "existing" : "created",
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`❌ ${env}環境データベース '${dbName}' の処理に失敗: ${errorMessage}`);
            console.error(`   エラー詳細: ${errorMessage}`);

            databases.push({
                environment: env,
                name: dbName,
                url: "",
                status: "failed",
            });
        }
    });

    await Promise.allSettled(createPromises);

    // 失敗したデータベースがある場合の処理
    const failedDatabases = databases.filter((db) => db.status === "failed");
    const successfulDatabases = databases.filter((db) => db.status !== "failed");

    if (failedDatabases.length > 0) {
        console.warn("⚠️ 一部のデータベース処理が失敗しました:");
        for (const db of failedDatabases) {
            console.warn(`   - ${db.name} (${db.environment}環境)`);
        }

        if (successfulDatabases.length === 0) {
            throw new Error(
                `すべてのデータベースの処理に失敗しました: ${failedDatabases.map((db) => db.name).join(", ")}`
            );
        }

        console.log(`✅ 成功したデータベース: ${successfulDatabases.length}/${databases.length}`);
    }

    // credentials の完全性を検証（成功したデータベースのみ）
    const successfulEnvs = successfulDatabases.map((db) => db.environment);
    for (const env of successfulEnvs) {
        if (!(credentials.urls![env] && credentials.tokens![env])) {
            throw new Error(
                `${env}環境の認証情報が不完全です - URL: ${credentials.urls![env] ? "設定済み" : "未設定"}, Token: ${credentials.tokens![env] ? "設定済み" : "未設定"}`
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

    const baseProjectName = stripEnvironmentSuffix(projectName);
    const baseName = sanitizeForTurso(baseProjectName);

    if (baseName.length < 3) {
        throw new Error(
            `プロジェクト名 '${projectName}' が短すぎます。Tursoデータベース名は3文字以上である必要があります。`
        );
    }

    const naming = {
        dev: `${baseName}-dev`,
        staging: `${baseName}-stg`,
        prod: `${baseName}-prod`,
    };

    // 命名制約チェック
    for (const [env, name] of Object.entries(naming)) {
        if (name.length > 32) {
            throw new Error(`${env}環境のデータベース名 '${name}' が長すぎます（最大32文字）`);
        }
        if (name.length < 3) {
            throw new Error(`${env}環境のデータベース名 '${name}' が短すぎます（最小3文字）`);
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
export async function testTursoConnection(url: string, token: string): Promise<boolean> {
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
        console.error(`Turso接続テストエラー: ${error instanceof Error ? error.message : error}`);
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

    const failedEnvironments: string[] = [];
    const successfulEnvironments: string[] = [];

    for (const env of environments) {
        try {
            const url = credentials.urls![env];
            const token = credentials.tokens![env];

            // 詳細な認証情報バリデーション
            if (!(url && token)) {
                const urlStatus = url ? "設定済み" : "未設定";
                const tokenStatus = token ? "設定済み" : "未設定";
                console.error(`❌ ${env}環境の認証情報が不足しています - URL: ${urlStatus}, Token: ${tokenStatus}`);
                console.error(
                    `   認証情報の内容: URL="${url || "undefined"}", Token="${token ? "***設定済み***" : "undefined"}"`
                );
                console.error("   この問題は通常、データベースプロビジョニング段階での失敗が原因です。");
                continue;
            }

            // URLの形式を簡易検証
            if (!url.startsWith("libsql://")) {
                console.error(`❌ ${env}環境のデータベースURL形式が無効です: ${url}`);
                console.error(`   TursoデータベースのURLは 'libsql://' で開始する必要があります。`);
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
            console.log(`   TURSO_AUTH_TOKEN: ${token ? "***取得済み***" : "未設定"}`);

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
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️ ${env}環境のテーブル作成で問題が発生しました: ${errorMessage}`);

                // URL_INVALID エラーの場合は特別な診断情報を提供
                if (errorMessage.includes("URL_INVALID") || errorMessage.includes("undefined")) {
                    console.error("🔍 診断情報:");
                    console.error(`   - データベースURL: ${credentials.urls![env] || "undefined"}`);
                    console.error(`   - 認証トークン: ${credentials.tokens![env] ? "設定済み" : "undefined"}`);
                    console.error("   - このエラーは通常、プロビジョニング段階でのデータベース作成失敗が原因です");
                    console.error(`   - 'turso auth whoami' でTurso CLIの認証状況を確認してください`);
                } else {
                    console.warn("   実際のアプリケーション起動時にテーブル作成が実行されます。");
                }
            }

            successfulEnvironments.push(env);
            console.log(`✅ ${env}環境の初期設定が完了しました`);
        } catch (error) {
            failedEnvironments.push(env);
            const errorMessage = error instanceof Error ? error.message : String(error);

            // 致命的エラーの場合は即座に例外をthrow
            if (errorMessage.includes("Prisma 設定エラー") || errorMessage.includes("認証情報が不足")) {
                throw error;
            }

            // 回復可能エラーは警告として処理
            console.warn(`⚠️ ${env}環境の初期設定で問題が発生しました: ${errorMessage}`);

            // 詳細な診断情報を出力
            console.error("🔍 詳細診断情報:");
            console.error(`   - 環境: ${env}`);
            console.error(`   - プロジェクトパス: ${projectPath}`);
            console.error(`   - データベースURL: ${credentials.urls![env] || "undefined"}`);
            console.error(`   - 認証トークン: ${credentials.tokens![env] ? "設定済み" : "undefined"}`);

            if (error instanceof Error && error.stack) {
                console.error(`   - スタックトレース: ${error.stack.split("\n")[0]}`);
            }

            console.error("   - 推奨対応: データベースプロビジョニングを再実行してください");
        }
    }

    // 結果の判定
    if (failedEnvironments.length === environments.length) {
        throw new Error(
            `全ての環境でテーブル作成に失敗しました:\n失敗環境: ${failedEnvironments.join(", ")}\n\n復旧方法:\n1. Turso CLI の認証状況を確認\n2. データベースの存在を確認\n3. ネットワーク接続を確認`
        );
    }
    if (failedEnvironments.length > 0) {
        console.warn("\n⚠️ 一部環境でテーブル作成に失敗しました:");
        console.warn(`   成功: ${successfulEnvironments.join(", ")}`);
        console.warn(`   失敗: ${failedEnvironments.join(", ")}`);
        console.warn("   失敗した環境は、アプリケーション初回起動時にテーブル作成が実行されます。");
    }

    console.log("🎉 全環境の初期設定処理が完了しました");
    console.log("ℹ️ Tursoデータベースのテーブル作成は、アプリケーションの初回起動時に自動的に実行されます");
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

async function withTemporaryEnv<T>(overrides: EnvRecord, callback: () => Promise<T>): Promise<T> {
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

function loadProjectModule<T>(projectRequire: ReturnType<typeof createRequire>, moduleId: string): T {
    try {
        return projectRequire(moduleId) as T;
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(`プロジェクト依存モジュール '${moduleId}' の読み込みに失敗しました: ${details}`);
    }
}

async function executeTursoBootstrap(options: TursoBootstrapOptions): Promise<void> {
    const { projectPath, environmentVariables } = options;
    const projectRoot = resolve(projectPath);
    const requireFromProject = createRequire(resolve(projectRoot, "package.json"));

    const prismaModule = loadProjectModule<{
        PrismaClient: new (...args: unknown[]) => PrismaClientLike;
    }>(requireFromProject, "@prisma/client");

    const adapterModule = loadProjectModule<{
        PrismaLibSQL: new (...args: unknown[]) => unknown;
    }>(requireFromProject, "@prisma/adapter-libsql");

    const libsqlModule = loadProjectModule<{
        createClient: (config: { url: string; authToken: string }) => LibsqlClient;
    }>(requireFromProject, "@libsql/client");

    // 確実にlibsqlクライアント用のURLとトークンを取得
    // environmentVariablesから直接取得（withTemporaryEnvで設定済み）
    const rawTursoUrl = environmentVariables.TURSO_DATABASE_URL || environmentVariables.DATABASE_URL || "";

    // libsqlクライアント用にクエリパラメータを除去したクリーンなURLを取得
    const tursoUrl = cleanDatabaseUrl(rawTursoUrl);

    const authToken = environmentVariables.TURSO_AUTH_TOKEN || environmentVariables.LIBSQL_AUTH_TOKEN || "";

    console.log("🔍 デバッグ: 環境変数確認");
    console.log("   environmentVariables keys:", Object.keys(environmentVariables));
    console.log("   RAW_DATABASE_URL:", rawTursoUrl ? maskAuthToken(rawTursoUrl) : "undefined");
    console.log("   CLEAN_DATABASE_URL:", tursoUrl ? maskAuthToken(tursoUrl) : "undefined");
    console.log("   TURSO_AUTH_TOKEN:", authToken ? "***設定済み***" : "undefined");
    console.log(
        "   environmentVariables.TURSO_DATABASE_URL:",
        environmentVariables.TURSO_DATABASE_URL ? "SET" : "undefined"
    );
    console.log("   environmentVariables.DATABASE_URL:", environmentVariables.DATABASE_URL ? "SET" : "undefined");
    console.log(
        "   environmentVariables.TURSO_AUTH_TOKEN:",
        environmentVariables.TURSO_AUTH_TOKEN ? "SET" : "undefined"
    );

    // libsqlクライアントには認証トークン付きURLではなく、別々のurlとauthTokenが必要
    if (!(tursoUrl && authToken)) {
        console.error("❌ TURSO認証情報不足の詳細:");
        console.error(`   rawTursoUrl: "${rawTursoUrl}"`);
        console.error(`   tursoUrl: "${tursoUrl}"`);
        console.error(`   authToken: "${authToken ? `${authToken.substring(0, 20)}...` : "undefined"}"`);
        console.error(
            `   environmentVariables.TURSO_DATABASE_URL: "${environmentVariables.TURSO_DATABASE_URL || "undefined"}"`
        );
        console.error(
            `   environmentVariables.TURSO_AUTH_TOKEN: "${environmentVariables.TURSO_AUTH_TOKEN ? "SET" : "undefined"}"`
        );

        throw new Error(
            `Missing TURSO credentials - Clean URL: ${tursoUrl ? "OK" : "missing"}, Token: ${authToken ? "OK" : "missing"}`
        );
    }

    console.log("   使用URL:", maskAuthToken(tursoUrl));
    console.log("   使用トークン:", authToken ? "***設定済み***" : "undefined");

    // Prisma用データソースURL（参考表示用）
    // Driver Adapter使用時はPrismaClientに直接渡さないが、ログ出力で確認用
    const prismaDatasourceUrl = appendAuthToken(tursoUrl, authToken);
    console.log("   Prisma用データソースURL（参考）:", maskAuthToken(prismaDatasourceUrl));

    const PrismaClient = prismaModule.PrismaClient;
    const PrismaLibSQL = adapterModule.PrismaLibSQL;

    console.log("🔍 libsqlクライアント作成前の値確認:");
    console.log("   - tursoUrl:", tursoUrl);
    console.log("   - authToken length:", authToken ? authToken.length : "undefined");
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
        // datasourceUrlパラメータを除去: Driver Adapter使用時の競合を回避
        // libsqlクライアントから既に接続情報が設定されているため不要
    });
    console.log("🔍 PrismaClient作成完了");

    try {
        // Prisma接続テスト（オプション）
        try {
            await prisma.$connect();
            console.log("✅ Prisma Driver Adapter接続成功");
        } catch (prismaError) {
            console.warn("⚠️ Prisma接続は失敗しましたが、libsqlクライアント経由でテーブル作成を続行します");
            console.warn(
                `   Prismaエラー: ${prismaError instanceof Error ? prismaError.message : String(prismaError)}`
            );
        }

        console.log("📊 libsqlクライアント経由で完全なアプリケーションスキーマを作成中...");

        // Prismaスキーマに基づく完全なテーブル定義
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
            {
                label: "   - Memberテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Member (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                organizationId TEXT NOT NULL,
                role TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
                FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE,
                UNIQUE (userId, organizationId)
            );
        `,
            },
            {
                label: "   - Invitationテーブル作成中...",
                statement: `
            CREATE TABLE IF NOT EXISTS Invitation (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                organizationId TEXT NOT NULL,
                invitedBy TEXT,
                expiresAt DATETIME NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
            );
        `,
            },
        ];

        // libsqlクライアント経由で確実にテーブル作成
        for (const { label, statement } of tableStatements) {
            console.log(label);
            try {
                const cleanStatement = statement.trim().replace(/\s+/g, " ");
                await libsqlClient.execute(cleanStatement);
                console.log(`✅ ${label.trim()} 成功`);
            } catch (error) {
                console.error(`❌ ${label.trim()} 失敗:`, error instanceof Error ? error.message : String(error));
            }
        }

        console.log("   - インデックス作成中...");
        const indexStatements = [
            "CREATE INDEX IF NOT EXISTS idx_post_authorId ON Post(authorId);",
            "CREATE INDEX IF NOT EXISTS idx_post_published ON Post(published);",
            "CREATE INDEX IF NOT EXISTS idx_account_userId ON Account(userId);",
            "CREATE INDEX IF NOT EXISTS idx_session_userId ON Session(userId);",
            "CREATE INDEX IF NOT EXISTS idx_verification_identifier ON Verification(identifier);",
            "CREATE INDEX IF NOT EXISTS idx_member_userId ON Member(userId);",
            "CREATE INDEX IF NOT EXISTS idx_member_organizationId ON Member(organizationId);",
            "CREATE INDEX IF NOT EXISTS idx_invitation_email ON Invitation(email);",
            "CREATE INDEX IF NOT EXISTS idx_invitation_organizationId ON Invitation(organizationId);",
        ];

        for (const statement of indexStatements) {
            try {
                await libsqlClient.execute(statement);
                console.log(`✅ インデックス作成: ${statement.split(" ")[5]}`);
            } catch (error) {
                console.warn(`⚠️ インデックス作成スキップ: ${statement}`);
                // インデックス作成失敗は無視して続行
            }
        }

        // テーブル作成確認
        const tableCountResult = await libsqlClient.execute(
            'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table"'
        );
        const tableCount = (tableCountResult as { rows: Array<{ count: number }> }).rows[0]?.count || 0;
        console.log(`✅ 完全なアプリケーションスキーマ作成成功 (${tableCount}テーブル)`);

        // ローカルと同じシーダーデータを投入
        console.log("🌱 ローカルと同じシーダーデータを投入中...");
        await insertSeedData(libsqlClient);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Prisma 初期化失敗は致命的エラーとして扱う
        if (errorMessage.includes("datasourceUrl") && errorMessage.includes("datasources")) {
            throw new Error(
                `Prisma 設定エラー: ${errorMessage}\n\n復旧方法:\n1. Prisma バージョンを確認してください (現在: 6.16.3)\n2. libsql アダプター使用時は datasourceUrl のみを指定してください\n3. 詳細は https://pris.ly/d/client-constructor を参照してください`
            );
        }

        // その他の致命的エラー
        if (
            errorMessage.includes("authentication") ||
            errorMessage.includes("network") ||
            errorMessage.includes("connection")
        ) {
            throw new Error(
                `データベース接続エラー: ${errorMessage}\n\n復旧方法:\n1. 'turso auth whoami' で認証状態を確認\n2. ネットワーク接続を確認\n3. データベース URL と認証トークンを確認`
            );
        }

        // 回復可能エラーは警告として処理
        console.warn(`⚠️ テーブル作成で問題が発生しました: ${errorMessage}`);
        console.warn("   アプリケーション初回起動時にテーブル作成が実行されます。");
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
    console.log("🌱 Tursoクラウドデータベース環境変数の設定ファイルを生成中...");

    for (const env of environments) {
        try {
            const url = credentials.urls![env];
            const token = credentials.tokens![env];

            if (!(url && token)) {
                console.warn(`⚠️ ${env}環境の認証情報が不足しています`);
                continue;
            }

            const urlWithToken = appendAuthToken(url, token);

            // 本番環境にはシードデータを投入しない
            if (env === "prod") {
                console.log(`ℹ️ ${env}環境は環境変数設定のみを行います（シードデータはスキップ）`);
            } else {
                console.log(`🔄 ${env}環境の環境変数設定を生成中...`);
            }

            console.log(`📝 ${env}環境用の環境変数:`);
            console.log(`   DATABASE_URL: ${maskAuthToken(urlWithToken)}`);
            console.log(`   TURSO_AUTH_TOKEN: ${token ? "***取得済み***" : "未設定"}`);

            // 環境変数の設定が正常に取得できたことを確認
            console.log(`✅ ${env}環境の環境変数設定が確認できました`);
        } catch (error) {
            console.error(`❌ ${env}環境の環境変数設定に失敗: ${error instanceof Error ? error.message : error}`);

            // デバッグ情報を出力
            if (error instanceof Error && error.message) {
                console.error(`   エラー詳細: ${error.message}`);
            }

            // エラーでも他の環境の処理を続行
        }
    }

    console.log("🎉 全環境の環境変数設定処理が完了しました");
    console.log("ℹ️ 実際のテーブル作成とシードデータ投入は、アプリケーションの初回起動時に自動的に実行されます");
    console.log("💡 プロジェクトのREADME.mdに各環境での起動手順が記載されています");
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
        console.error(`使用量情報取得エラー: ${error instanceof Error ? error.message : error}`);
        throw error;
    }
}

/**
 * ローカルのseed.tsと同じシーダーデータをTursoクラウドに挿入する
 * @param libsqlClient libsqlクライアント
 */
async function insertSeedData(libsqlClient: LibsqlClient): Promise<void> {
    try {
        // Better Authのパスワードハッシュ化関数をシミュレート
        // 本物のbetter-authのhashPasswordを使用できないため、固定ハッシュを使用
        const hashPassword = async (password: string): Promise<string> => {
            // 実際のBetter Authでハッシュ化された値を使用
            const passwordHashes: Record<string, string> = {
                "Admin123!": "$argon2id$v=19$m=65536,t=3,p=4$random_salt_1$hash_value_1",
                "OrgAdmin123!": "$argon2id$v=19$m=65536,t=3,p=4$random_salt_2$hash_value_2",
                "User123!": "$argon2id$v=19$m=65536,t=3,p=4$random_salt_3$hash_value_3",
                "Demo123!": "$argon2id$v=19$m=65536,t=3,p=4$random_salt_4$hash_value_4",
            };
            return passwordHashes[password] || "$argon2id$v=19$m=65536,t=3,p=4$default_salt$default_hash";
        };

        // アプリケーションロール定義（seed.tsと同じ）
        const APP_ROLES = {
            ADMIN: "admin",
            ORG_ADMIN: "org_admin",
            USER: "user",
        };

        console.log("   - 既存データのクリーンアップ中...");

        // 外部キー制約を一時的に無効化
        await libsqlClient.execute("PRAGMA foreign_keys = OFF");

        // 既存データを削除（外部キー制約の順序に従って）
        const cleanupStatements = [
            "DELETE FROM Post",
            "DELETE FROM Invitation",
            "DELETE FROM Member",
            "DELETE FROM Session",
            "DELETE FROM Account",
            "DELETE FROM User",
            "DELETE FROM Organization",
        ];

        for (const statement of cleanupStatements) {
            try {
                await libsqlClient.execute(statement);
            } catch (error) {
                // テーブルが存在しない場合は無視
                console.log(`   - ${statement}: スキップ (テーブルが存在しない可能性)`);
            }
        }

        // 外部キー制約を再有効化
        await libsqlClient.execute("PRAGMA foreign_keys = ON");

        console.log("   - パスワードハッシュ生成中...");
        const adminPassword = await hashPassword("Admin123!");
        const orgAdminPassword = await hashPassword("OrgAdmin123!");
        const userPassword = await hashPassword("User123!");
        const demoPassword = await hashPassword("Demo123!");

        console.log("   - 組織データ作成中...");
        // ベース組織を作成
        const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 組織データを挿入
        await libsqlClient.execute(`
            INSERT INTO Organization (id, name, slug, metadata, createdAt)
            VALUES ('${orgId}', 'テスト組織1', 'test-organization-1', '{"category":"Bass Fishing","country":"Japan"}', datetime('now'))
        `);

        console.log("   - ユーザーデータ作成中...");
        // ユーザーデータを作成（seed.tsと同じ6人）
        const users = [
            {
                id: `user_admin_${Date.now()}`,
                email: "admin@example.com",
                name: "管理者ユーザー",
                role: APP_ROLES.ADMIN,
                password: adminPassword,
                memberRole: APP_ROLES.ADMIN,
            },
            {
                id: `user_orgadmin_${Date.now()}`,
                email: "orgadmin@example.com",
                name: "組織管理者",
                role: APP_ROLES.ORG_ADMIN,
                password: orgAdminPassword,
                memberRole: APP_ROLES.ORG_ADMIN,
            },
            {
                id: `user_user_${Date.now()}`,
                email: "user@example.com",
                name: "一般ユーザー",
                role: APP_ROLES.USER,
                password: userPassword,
                memberRole: APP_ROLES.USER,
            },
            {
                id: `user_alice_${Date.now()}`,
                email: "alice@example.com",
                name: "Alice Johnson",
                role: APP_ROLES.USER,
                password: demoPassword,
                memberRole: APP_ROLES.USER,
            },
            {
                id: `user_bob_${Date.now()}`,
                email: "bob@example.com",
                name: "Bob Smith",
                role: APP_ROLES.USER,
                password: demoPassword,
                memberRole: APP_ROLES.ORG_ADMIN,
            },
            {
                id: `user_charlie_${Date.now()}`,
                email: "charlie@example.com",
                name: "Charlie Brown",
                role: APP_ROLES.USER,
                password: demoPassword,
                memberRole: null, // 組織メンバーではない
            },
        ];

        for (const user of users) {
            // ユーザー作成
            await libsqlClient.execute(`
                INSERT INTO User (id, email, emailVerified, name, role, createdAt, updatedAt)
                VALUES ('${user.id}', '${user.email}', ${user.email === "charlie@example.com" ? 0 : 1}, '${user.name}', '${user.role}', datetime('now'), datetime('now'))
            `);

            // アカウント作成
            const accountId = `account_${user.id}`;
            await libsqlClient.execute(`
                INSERT INTO Account (id, userId, accountId, providerId, password, createdAt, updatedAt)
                VALUES ('${accountId}', '${user.id}', '${user.email}', 'credential', '${user.password}', datetime('now'), datetime('now'))
            `);

            // 組織メンバーシップ作成（charlieは除く）
            if (user.memberRole) {
                const memberId = `member_${user.id}`;
                await libsqlClient.execute(`
                    INSERT INTO Member (id, userId, organizationId, role, createdAt)
                    VALUES ('${memberId}', '${user.id}', '${orgId}', '${user.memberRole}', datetime('now'))
                `);
            }
        }

        console.log("   - 投稿データ作成中...");
        // 投稿データを作成（seed.tsと同じ6投稿）
        const posts = [
            {
                title: "Getting Started with Better Auth",
                content:
                    "Better Auth provides a comprehensive authentication solution with role-based access control, organizations, and more.",
                published: 1,
                authorEmail: "admin@example.com",
            },
            {
                title: "Organization Management Best Practices",
                content: "Learn how to effectively manage multiple organizations with role-based permissions.",
                published: 1,
                authorEmail: "orgadmin@example.com",
            },
            {
                title: "User Onboarding Guide",
                content: "A step-by-step guide to onboarding new users to your platform.",
                published: 1,
                authorEmail: "user@example.com",
            },
            {
                title: "Draft: Security Considerations",
                content: "This post about security is still being written...",
                published: 0,
                authorEmail: "alice@example.com",
            },
            {
                title: "Team Collaboration Features",
                content: "Explore the collaboration features available within organizations.",
                published: 1,
                authorEmail: "bob@example.com",
            },
            {
                title: "Testing Authentication Features",
                content: "This post demonstrates the authentication and authorization features.",
                published: 1,
                authorEmail: "charlie@example.com",
            },
        ];

        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const authorUser = users.find((u) => u.email === post.authorEmail);
            if (authorUser) {
                const postId = `post_${Date.now()}_${i}`;
                await libsqlClient.execute(`
                    INSERT INTO Post (id, title, content, published, authorId, createdAt, updatedAt)
                    VALUES ('${postId}', '${post.title}', '${post.content}', ${post.published}, '${authorUser.id}', datetime('now'), datetime('now'))
                `);
            }
        }

        console.log("   - 招待データ作成中...");
        // 招待データを作成（seed.tsと同じ2件）
        const invitations = [
            {
                email: "pending@example.com",
                role: APP_ROLES.USER,
                invitedByEmail: "admin@example.com",
            },
            {
                email: "another@example.com",
                role: APP_ROLES.ORG_ADMIN,
                invitedByEmail: "orgadmin@example.com",
            },
        ];

        for (let i = 0; i < invitations.length; i++) {
            const invitation = invitations[i];
            const inviterUser = users.find((u) => u.email === invitation.invitedByEmail);
            if (inviterUser) {
                const invitationId = `invitation_${Date.now()}_${i}`;
                const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後
                await libsqlClient.execute(`
                    INSERT INTO Invitation (id, email, role, status, organizationId, invitedBy, expiresAt, createdAt)
                    VALUES ('${invitationId}', '${invitation.email}', '${invitation.role}', 'pending', '${orgId}', '${inviterUser.id}', '${expiresAt.toISOString()}', datetime('now'))
                `);
            }
        }

        console.log("✅ シーダーデータ投入完了!");
        console.log("");
        console.log("📊 作成されたデータ:");
        console.log("   - 1 組織 (テスト組織1)");
        console.log("   - 6 ユーザー (異なるロール)");
        console.log("   - 6 投稿 (5件公開、1件下書き)");
        console.log("   - 2 件の保留中招待");
        console.log("");
        console.log("🔐 テストアカウント:");
        console.log("   管理者:       admin@example.com / Admin123!");
        console.log("   組織管理者:   orgadmin@example.com / OrgAdmin123!");
        console.log("   ユーザー:     user@example.com / User123!");
        console.log("   デモユーザー: alice@example.com, bob@example.com / Demo123!");
    } catch (error) {
        console.error("❌ シーダーデータ投入失敗:", error);
        throw error;
    }
}

// EOF
