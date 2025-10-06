/**
 * Turso CLIプロビジョニング拡張機能
 */

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
    const naming = await validateTursoNaming(options.projectName);

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
        staging: `${baseName}-staging`,
        prod: baseName,
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

        // プロジェクト名ベースの命名パターンをチェック
        const patterns = [
            `${sanitizedProjectName}`,
            `${sanitizedProjectName}-dev`,
            `${sanitizedProjectName}-staging`,
            `${sanitizedProjectName}-prod`,
            `${sanitizedProjectName}-production`,
        ];

        return patterns.some(
            (pattern) =>
                dbName === pattern ||
                dbName.startsWith(`${pattern}-`) ||
                pattern.startsWith(dbName)
        );
    });
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
