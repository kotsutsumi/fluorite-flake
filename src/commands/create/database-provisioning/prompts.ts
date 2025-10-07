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

    // 作成モードと命名設定の取得（キャンセル時に再試行するループ）
    let naming: { dev: string; staging: string; prod: string };
    let mode: "create" | "existing";

    while (true) {
        // 作成モード選択
        mode = (await select({
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

        try {
            // 命名設定の取得
            naming =
                mode === "create"
                    ? await collectNamingConfig(projectName, provider)
                    : await selectExistingDatabases(projectName, provider);
            break; // 成功した場合はループを抜ける
        } catch (error) {
            if (
                error instanceof Error &&
                error.message === "DATABASE_SELECTION_CANCELLED"
            ) {
                // キャンセルされた場合は作成モード選択に戻る
                console.log("📝 作成モードの選択に戻ります...");
                continue;
            }
            // その他のエラーは再スロー
            throw error;
        }
    }

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

        // 関連するデータベースが見つからない場合は、自動的にすべてのデータベースから選択
        if (compatibleDatabases.length === 0) {
            console.log(
                `ℹ️ プロジェクト名 "${projectName}" に関連するデータベースが見つからないため、すべてのデータベースから選択します。`
            );

            // 利用可能なデータベースがない場合は新規作成モードに変更
            if (databases.length === 0) {
                console.warn(
                    "⚠️ 利用可能なデータベースがありません。新規作成モードに変更します。"
                );
                return await collectNamingConfig(projectName, provider);
            }

            // 全データベースを選択肢として使用
            return await selectFromAllDatabases(databases, provider);
        }

        // 環境別にデータベースを選択
        return await selectFromAllDatabases(compatibleDatabases, provider);
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
        staging: `${sanitizedName}-stg`,
        prod: `${sanitizedName}-prod`,
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
 * 指定されたデータベース一覧から環境別にデータベースを選択する
 * @param databases データベース一覧
 * @param provider データベースプロバイダ
 * @returns 選択されたデータベース設定
 */
async function selectFromAllDatabases(
    databases: Array<{ name: string; url?: string }>,
    _provider: "turso" | "supabase"
): Promise<{ dev: string; staging: string; prod: string }> {
    // プロジェクトベース名でグループ化
    const projectGroups = groupDatabasesByProject(databases);

    // グループ化されたプロジェクトから選択
    if (projectGroups.size > 1) {
        const projectOptions = Array.from(projectGroups.entries()).map(
            ([projectName, dbs]) => ({
                value: projectName,
                label: projectName,
                hint: `${dbs.length}個のデータベース`,
            })
        );

        // 戻るオプションを追加
        projectOptions.push({
            value: "__back__",
            label: "← 前の選択に戻る",
            hint: "データベース作成モードの選択に戻ります",
        });

        const selectedProject = await select({
            message: "データベースプロジェクトを選択してください:",
            options: projectOptions,
        });

        // キャンセルまたは戻るオプションの処理
        if (isCancel(selectedProject) || selectedProject === "__back__") {
            throw new Error("DATABASE_SELECTION_CANCELLED");
        }

        const projectDatabases =
            projectGroups.get(selectedProject as string) || [];
        return await selectEnvironmentDatabases(projectDatabases);
    }

    // グループが1つしかない場合は直接選択
    const allDbs = Array.from(projectGroups.values()).flat();
    return await selectEnvironmentDatabases(allDbs);
}

/**
 * データベースをプロジェクトベース名でグループ化する
 * @param databases データベース一覧
 * @returns プロジェクト名 -> データベース一覧のマップ
 */
function groupDatabasesByProject(
    databases: Array<{ name: string; url?: string }>
): Map<string, Array<{ name: string; url?: string }>> {
    const groups = new Map<string, Array<{ name: string; url?: string }>>();

    for (const db of databases) {
        // 環境サフィックスを除去してプロジェクトベース名を取得
        // 例: "amp-jewelry-dev" -> "amp-jewelry"
        const projectName = extractProjectBaseName(db.name);

        if (!groups.has(projectName)) {
            groups.set(projectName, []);
        }
        groups.get(projectName)!.push(db);
    }

    return groups;
}

/**
 * データベース名からプロジェクトベース名を抽出する
 * @param dbName データベース名
 * @returns プロジェクトベース名
 */
export function extractProjectBaseName(dbName: string): string {
    // 一般的な環境サフィックスを除去
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
        if (dbName.endsWith(suffix)) {
            return dbName.substring(0, dbName.length - suffix.length);
        }
    }

    return dbName; // サフィックスが見つからない場合はそのまま返す
}

/**
 * 環境別にデータベースを自動割り当てする
 * @param databases 対象データベース一覧（既にプロジェクトでフィルタ済み）
 * @returns 自動割り当てされたデータベース設定
 */
async function selectEnvironmentDatabases(
    databases: Array<{ name: string; url?: string }>
): Promise<{ dev: string; staging: string; prod: string }> {
    // 環境別に自動分類
    const envMapping = {
        dev: null as string | null,
        staging: null as string | null,
        prod: null as string | null,
    };

    for (const db of databases) {
        const name = db.name;
        if (name.endsWith("-dev") || name.endsWith("-development")) {
            envMapping.dev = name;
        } else if (name.endsWith("-staging") || name.endsWith("-stg")) {
            envMapping.staging = name;
        } else if (name.endsWith("-prod") || name.endsWith("-production")) {
            envMapping.prod = name;
        } else {
            // サフィックスがない場合は本番環境として扱う
            envMapping.prod = name;
        }
    }

    // 足りない環境があった場合の確認
    const missingEnvs = Object.entries(envMapping)
        .filter(([_, dbName]) => !dbName)
        .map(([env, _]) => env);

    if (missingEnvs.length > 0) {
        console.log("ℹ️ 自動割り当て結果:");
        console.log(`   開発環境: ${envMapping.dev || "なし"}`);
        console.log(`   ステージング環境: ${envMapping.staging || "なし"}`);
        console.log(`   本番環境: ${envMapping.prod || "なし"}`);

        if (missingEnvs.length > 0) {
            console.log(`⚠️ 不足している環境: ${missingEnvs.join(", ")}`);
        }

        const proceed = await confirm({
            message: "この設定で続行しますか？",
        });

        if (isCancel(proceed) || !proceed) {
            throw new Error("DATABASE_SELECTION_CANCELLED");
        }
    } else {
        console.log("✅ 環境別データベースを自動割り当てしました:");
        console.log(`   開発環境: ${envMapping.dev}`);
        console.log(`   ステージング環境: ${envMapping.staging}`);
        console.log(`   本番環境: ${envMapping.prod}`);
    }

    return {
        dev: envMapping.dev || envMapping.prod || databases[0]?.name || "",
        staging:
            envMapping.staging || envMapping.prod || databases[0]?.name || "",
        prod: envMapping.prod || databases[0]?.name || "",
    };
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

// EOF
