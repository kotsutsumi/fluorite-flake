/**
 * Supabase CLI マイグレーション管理ユーティリティ
 *
 * データベースマイグレーションスクリプトの管理機能を提供します。
 */
import {
    executeSupabaseCommand,
    parseJsonResponse,
    throwOnError,
} from "./executor.js";
import type { DatabaseOptions, GlobalFlags, MigrationInfo } from "./types.js";

/**
 * 空のマイグレーションスクリプトを作成します
 *
 * @param migrationName - マイグレーション名
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function createMigration(
    migrationName: string,
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "new", migrationName];

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * ローカルおよびリモートマイグレーションを一覧表示します
 *
 * @param options - 一覧表示オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<MigrationInfo[]> - マイグレーション情報の配列
 */
export async function listMigrations(
    options: DatabaseOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<MigrationInfo[]> {
    const args = ["migration", "list"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    if (options.password) {
        args.push("--password", options.password);
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    // 出力フォーマットをJSONに設定
    args.push("--output", "json");

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);

    return parseJsonResponse<MigrationInfo[]>(result);
}

/**
 * 保留中のマイグレーションをローカルデータベースに適用します
 *
 * @param options - 適用オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function upMigrations(
    options: {
        dbUrl?: string;
        includeAll?: boolean;
        linked?: boolean;
        local?: boolean;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "up"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.includeAll) {
        args.push("--include-all");
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * 適用されたマイグレーションを最後のnバージョンまでリセットします
 *
 * @param options - リセットオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function downMigrations(
    options: {
        dbUrl?: string;
        last?: number;
        linked?: boolean;
        local?: boolean;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "down"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.last) {
        args.push("--last", options.last.toString());
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * 履歴テーブルからマイグレーションファイルを取得します
 *
 * @param options - 取得オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function fetchMigrations(
    options: DatabaseOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "fetch"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * マイグレーション履歴テーブルを修復します
 *
 * @param versions - 修復するバージョン配列
 * @param options - 修復オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function repairMigrations(
    versions: string[] = [],
    options: {
        dbUrl?: string;
        linked?: boolean;
        local?: boolean;
        password?: string;
        status?: "applied" | "reverted";
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "repair", ...versions];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    if (options.password) {
        args.push("--password", options.password);
    }

    if (options.status) {
        args.push("--status", options.status);
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * マイグレーションを単一ファイルにスカッシュします
 *
 * @param options - スカッシュオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function squashMigrations(
    options: {
        dbUrl?: string;
        linked?: boolean;
        local?: boolean;
        password?: string;
        version?: string;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["migration", "squash"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    if (options.password) {
        args.push("--password", options.password);
    }

    if (options.version) {
        args.push("--version", options.version);
    }

    // グローバルフラグの追加
    if (globalFlags.debug) {
        args.push("--debug");
    }

    if (globalFlags.profile) {
        args.push("--profile", globalFlags.profile);
    }

    if (globalFlags.workdir) {
        args.push("--workdir", globalFlags.workdir);
    }

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * 指定されたマイグレーションが存在するかどうかを確認します
 *
 * @param migrationName - マイグレーション名またはバージョン
 * @param options - データベースオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<boolean> - マイグレーションが存在するかどうか
 */
export async function migrationExists(
    migrationName: string,
    options: DatabaseOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<boolean> {
    try {
        const migrations = await listMigrations(options, globalFlags);
        return migrations.some(
            (migration) =>
                migration.name === migrationName ||
                migration.version === migrationName
        );
    } catch {
        return false;
    }
}

// EOF
