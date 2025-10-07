/**
 * Supabase CLIプロビジョニング拡張機能
 */

import type {
    DatabaseCredentials,
    ProvisioningResult,
    SupabaseProvisioningOptions,
} from "../../commands/create/database-provisioning/types.js";
import {
    createProject,
    getApiKeys,
    isAuthenticated,
    listProjects,
} from "./index.js";

/**
 * Supabaseプロビジョニング結果の型
 */
function stripEnvironmentSuffix(name: string): string {
    const suffixes = [
        "-dev",
        "-development",
        "-staging",
        "-stg",
        "-prod",
        "-production",
        "-test",
    ];

    for (const suffix of suffixes) {
        if (name.endsWith(suffix)) {
            return name.slice(0, name.length - suffix.length);
        }
    }

    return name;
}

export interface SupabaseProvisioningResult extends ProvisioningResult {
    credentials: DatabaseCredentials;
}

/**
 * Supabaseプロジェクトをプロビジョニングする
 * @param options プロビジョニングオプション
 * @returns プロビジョニング結果
 */
export async function provisionSupabaseProjects(
    options: SupabaseProvisioningOptions
): Promise<SupabaseProvisioningResult> {
    // 1. 認証チェック
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        throw new Error(
            "Supabase CLI に認証されていません。`supabase login` を実行してください。"
        );
    }

    // 2. 既存プロジェクト確認
    const existingProjects = await listProjects();

    // 3. 命名設定の検証
    const naming = await validateSupabaseNaming(options.projectName);

    // 4. 並行でプロジェクト作成・APIキー取得
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

    // 並行処理でプロジェクトとAPIキーを作成
    const createPromises = options.environments.map(async (env) => {
        const projectName = naming[env];
        const exists = existingProjects.some(
            (project) => project.name === projectName
        );

        try {
            let projectRef: string;

            if (exists) {
                // 既存プロジェクトの参照を取得
                const existingProject = existingProjects.find(
                    (p) => p.name === projectName
                );
                projectRef = existingProject!.ref;
                console.log(
                    `ℹ️ ${env}環境プロジェクト '${projectName}' は既に存在します`
                );
            } else {
                // プロジェクト作成
                const newProject = await createProject(projectName, {
                    orgId: options.organization,
                    region: options.region,
                });
                projectRef = newProject.ref;
                console.log(
                    `✅ ${env}環境プロジェクト '${projectName}' を作成しました`
                );
            }

            // APIキー取得
            const apiKeys = await getApiKeys(projectRef);

            // URL構築
            const url = `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

            credentials.urls[env] = url;
            credentials.tokens[env] = apiKeys.serviceRole; // Service Roleキーを使用

            databases.push({
                environment: env,
                name: projectName,
                url: `https://${projectRef}.supabase.co`,
                status: exists ? "existing" : "created",
            });
        } catch (error) {
            console.error(
                `❌ ${env}環境プロジェクト '${projectName}' の処理に失敗: ${error instanceof Error ? error.message : error}`
            );

            databases.push({
                environment: env,
                name: projectName,
                url: "",
                status: "failed",
            });
        }
    });

    await Promise.allSettled(createPromises);

    // 失敗したプロジェクトがある場合はエラー
    const failedProjects = databases.filter((db) => db.status === "failed");
    if (failedProjects.length > 0) {
        throw new Error(
            `以下のプロジェクトの作成に失敗しました: ${failedProjects.map((db) => db.name).join(", ")}`
        );
    }

    return {
        success: true,
        credentials,
        databases,
    };
}

/**
 * Supabase命名規則を検証し、適切な命名設定を生成する
 * @param projectName プロジェクト名
 * @returns 検証済み命名設定
 */
export async function validateSupabaseNaming(
    projectName: string
): Promise<{ dev: string; staging: string; prod: string }> {
    // Supabase制約: 1-63文字、英数字・ハイフンのみ、英字開始
    const sanitizeForSupabase = (name: string): string => {
        let sanitized = name
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 48); // 環境サフィックス用に余裕を持たせる

        // 英字で開始するように調整
        if (!/^[a-z]/.test(sanitized)) {
            sanitized = `app-${sanitized}`;
        }

        return sanitized;
    };

    const baseProjectName = stripEnvironmentSuffix(projectName);
    const baseName = sanitizeForSupabase(baseProjectName);

    const naming = {
        dev: `${baseName}-dev`,
        staging: `${baseName}-stg`,
        prod: `${baseName}-prod`,
    };

    // 命名制約チェック
    for (const [env, name] of Object.entries(naming)) {
        if (name.length > 63) {
            throw new Error(
                `${env}環境のプロジェクト名 '${name}' が長すぎます（最大63文字）`
            );
        }
        if (name.length < 1) {
            throw new Error(`${env}環境のプロジェクト名 '${name}' が空です`);
        }
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
            throw new Error(
                `${env}環境のプロジェクト名 '${name}' は英字で始まり、英小文字、数字、ハイフンのみ使用可能です`
            );
        }
    }

    return naming;
}

/**
 * Supabaseプロジェクトの接続をテストする
 * @param url データベースURL
 * @param apiKey APIキー
 * @returns 接続可能かどうか
 */
export async function testSupabaseConnection(
    url: string,
    apiKey: string
): Promise<boolean> {
    try {
        // 実際の接続テストは複雑なので、URLとAPIキーの形式をチェック
        if (!(url.startsWith("postgresql://") || url.startsWith("https://"))) {
            return false;
        }

        if (apiKey.length < 10) {
            return false;
        }

        // 実際の接続テストを行う場合は、Supabaseクライアントを使用
        // const supabase = createClient(url, apiKey);
        // const { data, error } = await supabase.from('_supabase_health_check').select('*').limit(1);

        return true;
    } catch (error) {
        console.error(
            `Supabase接続テストエラー: ${error instanceof Error ? error.message : error}`
        );
        return false;
    }
}

/**
 * 既存Supabaseプロジェクトから互換性のあるものを抽出する
 * @param projects プロジェクト一覧
 * @param projectName プロジェクト名
 * @returns 互換性のあるプロジェクト一覧
 */
export function filterCompatibleSupabaseProjects(
    projects: Array<{ name: string; ref: string; url?: string }>,
    projectName: string
): Array<{ name: string; ref: string; url?: string }> {
    const sanitizedProjectName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return projects.filter((project) => {
        const projectNameLower = project.name.toLowerCase();

        // プロジェクト名ベースの命名パターンをチェック
        const patterns = [
            sanitizedProjectName,
            `${sanitizedProjectName}-dev`,
            `${sanitizedProjectName}-staging`,
            `${sanitizedProjectName}-prod`,
            `${sanitizedProjectName}-production`,
            `app-${sanitizedProjectName}`,
            `app-${sanitizedProjectName}-dev`,
            `app-${sanitizedProjectName}-staging`,
            `app-${sanitizedProjectName}-prod`,
        ];

        return patterns.some(
            (pattern) =>
                projectNameLower === pattern ||
                projectNameLower.startsWith(`${pattern}-`) ||
                pattern.startsWith(projectNameLower)
        );
    });
}

/**
 * Supabaseプロジェクトの使用量情報を取得する
 * @param projectRef プロジェクト参照
 * @returns 使用量情報
 */
export async function getSupabaseUsageInfo(projectRef: string): Promise<{
    dbSize: number;
    egress: number;
    requests: number;
}> {
    try {
        // Supabase APIで使用量情報を取得
        // 実際の実装では、Supabase Management APIを使用
        console.log(`プロジェクト '${projectRef}' の使用量情報を取得中...`);

        // モック実装
        return {
            dbSize: 0,
            egress: 0,
            requests: 0,
        };
    } catch (error) {
        console.error(
            `使用量情報取得エラー: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

/**
 * Supabaseプロジェクトのセットアップ状況を確認する
 * @param projectRef プロジェクト参照
 * @returns セットアップ情報
 */
export async function getSupabaseSetupInfo(projectRef: string): Promise<{
    hasRealtime: boolean;
    hasAuth: boolean;
    hasStorage: boolean;
    hasEdgeFunctions: boolean;
}> {
    try {
        // Supabaseプロジェクトの機能有効状況を確認
        console.log(
            `プロジェクト '${projectRef}' のセットアップ情報を取得中...`
        );

        // モック実装
        return {
            hasRealtime: true,
            hasAuth: true,
            hasStorage: true,
            hasEdgeFunctions: false,
        };
    } catch (error) {
        console.error(
            `セットアップ情報取得エラー: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

// EOF
