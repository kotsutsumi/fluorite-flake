/**
 * データベースプロビジョニング用のプロンプト機能
 */

import { confirm, isCancel, select, text } from "@clack/prompts";
import { listProjects as listSupabaseProjects } from "../../../utils/supabase-cli/index.js";
import { listDatabases as listTursoDatabases } from "../../../utils/turso-cli/index.js";
import type { DatabaseProvisioningConfig } from "./types.js";

/**
 * データベース設定を収集する
 * @param projectName プロジェクト名
 * @param existingProvider 既存のプロバイダ
 * @returns データベースプロビジョニング設定
 */
export async function collectDatabaseConfig(
    projectName: string,
    existingProvider?: "turso" | "supabase"
): Promise<DatabaseProvisioningConfig> {
    // プロバイダ選択
    const provider =
        existingProvider ||
        ((await select({
            message: "データベースプロバイダを選択してください:",
            options: [
                {
                    value: "turso",
                    label: "Turso (SQLite)",
                    hint: "Edge でも高速なSQLiteデータベース",
                },
                {
                    value: "supabase",
                    label: "Supabase (PostgreSQL)",
                    hint: "リアルタイム機能付きPostgreSQLデータベース",
                },
            ],
        })) as "turso" | "supabase");

    const authResolution = await resolveAuthentication(provider);
    if (authResolution === "cancel") {
        throw new Error("DATABASE_PROVISIONING_CANCELLED");
    }

    if (authResolution === "skip") {
        const defaultNaming = generateDefaultNaming(projectName, provider);
        console.warn(
            `⚠️ ${getProviderLabel(provider)} CLI の認証が未完了のため、プロビジョニングをスキップします。`
        );
        return {
            provider,
            mode: "create",
            naming: defaultNaming,
            options: {
                preserveData: false,
                autoMigrate: false,
                skipProvisioning: true,
            },
        };
    }

    // 作成モード選択
    const mode = (await select({
        message: "データベース作成モードを選択してください:",
        options: [
            {
                value: "create",
                label: "新規作成",
                hint: "新しいデータベースを作成します",
            },
            {
                value: "existing",
                label: "既存利用",
                hint: "既存のデータベースを使用します",
            },
        ],
    })) as "create" | "existing";

    // 命名設定の取得
    const naming =
        mode === "create"
            ? await collectNamingConfig(projectName, provider)
            : await selectExistingDatabases(projectName, provider);

    // 詳細オプションの収集
    const options = await collectDetailedOptions(mode);

    return {
        provider,
        mode,
        naming,
        options,
    };
}

/**
 * 認証状態をチェックする
 * @param provider データベースプロバイダ
 * @returns 認証されているかどうか
 */
async function checkAuthentication(
    provider: "turso" | "supabase"
): Promise<boolean> {
    try {
        if (provider === "turso") {
            // Turso CLIで認証チェック
            const { isAuthenticated: tursoIsAuthenticated } = await import(
                "../../../utils/turso-cli/auth.js"
            );
            return await tursoIsAuthenticated();
        }
        // Supabase CLIで認証チェック
        const { isAuthenticated: supabaseIsAuthenticated } = await import(
            "../../../utils/supabase-cli/auth.js"
        );
        return await supabaseIsAuthenticated();
    } catch (error) {
        console.error(
            `認証チェックエラー: ${error instanceof Error ? error.message : error}`
        );
        return false;
    }
}

/**
 * プロバイダの表示名を取得する
 */
function getProviderLabel(provider: "turso" | "supabase"): string {
    return provider === "turso" ? "Turso" : "Supabase";
}

/**
 * 認証に使用するコマンドを取得する
 */
function getProviderLoginCommand(provider: "turso" | "supabase"): string {
    return provider === "turso" ? "turso auth login" : "supabase login";
}

/**
 * 認証手順を案内する
 */
function printAuthenticationGuide(provider: "turso" | "supabase"): void {
    const label = getProviderLabel(provider);
    const command = getProviderLoginCommand(provider);

    console.warn(`⚠️ ${label} CLI に認証されていません。`);
    console.log(
        `   1. 別のターミナルで \`${command}\` を実行して認証を完了してください。`
    );
    console.log(
        "   2. 認証が完了したら、このプロンプトに戻って再チェックを選択してください。"
    );
}

/**
 * 認証状態を解決する
 */
async function resolveAuthentication(
    provider: "turso" | "supabase"
): Promise<"authenticated" | "skip" | "cancel"> {
    while (true) {
        const authenticated = await checkAuthentication(provider);
        if (authenticated) {
            return "authenticated";
        }

        printAuthenticationGuide(provider);

        const action = await select({
            message: `${getProviderLabel(provider)} CLI の認証が必要です。操作を選択してください:`,
            options: [
                {
                    value: "retry",
                    label: "認証を完了したので再チェックする",
                },
                {
                    value: "skip",
                    label: "今回はプロビジョニングをスキップする",
                    hint: "環境変数は後で手動設定できます",
                },
                {
                    value: "cancel",
                    label: "データベース設定をキャンセルする",
                },
            ],
        });

        if (isCancel(action) || action === "cancel") {
            return "cancel";
        }
        if (action === "skip") {
            return "skip";
        }

        // ループを継続し、再度認証状態を確認
    }
}

/**
 * 新規作成時の命名設定を収集する
 * @param projectName プロジェクト名
 * @param provider データベースプロバイダ
 * @returns 命名設定
 */
async function collectNamingConfig(
    projectName: string,
    provider: "turso" | "supabase"
): Promise<{ dev: string; staging: string; prod: string }> {
    const baseNaming = generateDefaultNaming(projectName, provider);

    const customizeNaming = (await confirm({
        message: "命名設定をカスタマイズしますか？",
        initialValue: false,
    })) as boolean;

    if (!customizeNaming) {
        return baseNaming;
    }

    // カスタム命名設定
    const dev = await text({
        message: "開発環境データベース名:",
        initialValue: baseNaming.dev,
        validate: (value: string) => validateDatabaseName(value, provider),
    });

    const staging = await text({
        message: "ステージング環境データベース名:",
        initialValue: baseNaming.staging,
        validate: (value: string) => validateDatabaseName(value, provider),
    });

    const prod = await text({
        message: "本番環境データベース名:",
        initialValue: baseNaming.prod,
        validate: (value: string) => validateDatabaseName(value, provider),
    });

    return {
        dev: dev as string,
        staging: staging as string,
        prod: prod as string,
    };
}

/**
 * 既存データベースから選択する
 * @param projectName プロジェクト名
 * @param provider データベースプロバイダ
 * @returns 選択されたデータベース設定
 */
async function selectExistingDatabases(
    projectName: string,
    provider: "turso" | "supabase"
): Promise<{ dev: string; staging: string; prod: string }> {
    try {
        const databases =
            provider === "turso"
                ? await listTursoDatabases()
                : await listSupabaseProjects();

        // プロジェクト名に関連するデータベースをフィルタリング
        const compatibleDatabases = filterCompatibleDatabases(
            databases,
            projectName
        );

        if (compatibleDatabases.length === 0) {
            throw new Error(
                `${projectName} に関連するデータベースが見つかりません。`
            );
        }

        // 環境別にデータベースを選択
        const dev = (await select({
            message: "開発環境用データベースを選択:",
            options: compatibleDatabases.map((db) => ({
                value: db.name,
                label: db.name,
                hint: db.url || "",
            })),
        })) as string;

        const staging = (await select({
            message: "ステージング環境用データベースを選択:",
            options: compatibleDatabases.map((db) => ({
                value: db.name,
                label: db.name,
                hint: db.url || "",
            })),
        })) as string;

        const prod = (await select({
            message: "本番環境用データベースを選択:",
            options: compatibleDatabases.map((db) => ({
                value: db.name,
                label: db.name,
                hint: db.url || "",
            })),
        })) as string;

        return {
            dev: dev as string,
            staging: staging as string,
            prod: prod as string,
        };
    } catch (error) {
        console.error(
            `データベース一覧取得エラー: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

/**
 * 詳細オプションを収集する
 * @param mode 作成モード
 * @returns 詳細オプション
 */
async function collectDetailedOptions(mode: "create" | "existing"): Promise<{
    preserveData: boolean;
    autoMigrate: boolean;
    skipProvisioning: boolean;
}> {
    const preserveData =
        mode === "existing"
            ? ((await confirm({
                  message: "既存データを保持しますか？",
                  initialValue: false,
              })) as boolean)
            : false;

    const autoMigrate = (await confirm({
        message: "自動マイグレーションを有効にしますか？",
        initialValue: true,
    })) as boolean;

    const skipProvisioning = (await confirm({
        message: "データベースプロビジョニングをスキップしますか？",
        initialValue: false,
    })) as boolean;

    return {
        preserveData,
        autoMigrate,
        skipProvisioning,
    };
}

/**
 * デフォルトの命名設定を生成する
 * @param projectName プロジェクト名
 * @param provider データベースプロバイダ
 * @returns デフォルト命名設定
 */
function generateDefaultNaming(
    projectName: string,
    provider: "turso" | "supabase"
): { dev: string; staging: string; prod: string } {
    const sanitizedName = sanitizeProjectName(projectName, provider);

    return {
        dev: `${sanitizedName}-dev`,
        staging: `${sanitizedName}-staging`,
        prod: sanitizedName, // 本番環境は環境サフィックスなし
    };
}

/**
 * プロジェクト名をサニタイズする
 * @param projectName プロジェクト名
 * @param provider データベースプロバイダ
 * @returns サニタイズされたプロジェクト名
 */
function sanitizeProjectName(
    projectName: string,
    provider: "turso" | "supabase"
): string {
    if (provider === "turso") {
        // Turso: 3-32文字、英数字・ハイフンのみ
        return projectName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 24); // 環境サフィックス用に余裕を持たせる
    }
    // Supabase: 1-63文字、英数字・ハイフンのみ、英字開始
    let sanitized = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    // 英字で開始するように調整
    if (!/^[a-z]/.test(sanitized)) {
        sanitized = `app-${sanitized}`;
    }

    return sanitized.slice(0, 48); // 環境サフィックス用に余裕を持たせる
}

/**
 * データベース名を検証する
 * @param name データベース名
 * @param provider データベースプロバイダ
 * @returns 検証結果メッセージ（問題なければundefined）
 */
function validateDatabaseName(
    name: string,
    provider: "turso" | "supabase"
): string | undefined {
    if (provider === "turso") {
        if (name.length < 3 || name.length > 32) {
            return "データベース名は3-32文字である必要があります。";
        }
        if (!/^[a-z0-9-]+$/.test(name)) {
            return "データベース名は英小文字、数字、ハイフンのみ使用可能です。";
        }
    } else {
        if (name.length < 1 || name.length > 63) {
            return "プロジェクト名は1-63文字である必要があります。";
        }
        if (!/^[a-z][a-z0-9-]*$/.test(name)) {
            return "プロジェクト名は英字で始まり、英小文字、数字、ハイフンのみ使用可能です。";
        }
    }

    return;
}

/**
 * 互換性のあるデータベースをフィルタリングする
 * @param databases データベース一覧
 * @param projectName プロジェクト名
 * @returns フィルタリングされたデータベース一覧
 */
function filterCompatibleDatabases(
    databases: Array<{ name: string; url?: string }>,
    projectName: string
): Array<{ name: string; url?: string }> {
    const sanitizedProjectName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");

    return databases.filter((db) => {
        const dbName = db.name.toLowerCase();
        return (
            dbName.includes(sanitizedProjectName) ||
            dbName.startsWith(sanitizedProjectName) ||
            sanitizedProjectName.includes(dbName)
        );
    });
}

// EOF
