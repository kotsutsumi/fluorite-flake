/**
 * Supabase CLI データベース管理ユーティリティ
 *
 * データベースの操作、マイグレーション、ダンプ、リセットなどの機能を提供します。
 */

import { executeSupabaseCommand, throwOnError } from "./executor.js";
import type { DatabaseOptions, GlobalFlags } from "./types.js";

/**
 * ローカル Postgres データベースを開始します
 *
 * @param options - 開始オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function startDatabase(
    options: { fromBackup?: string } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["db", "start"];

    // オプションの追加
    if (options.fromBackup) {
        args.push("--from-backup", options.fromBackup);
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
 * ローカルデータベースを現在のマイグレーションにリセットします
 *
 * @param options - リセットオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function resetDatabase(
    options: {
        dbUrl?: string;
        last?: number;
        linked?: boolean;
        local?: boolean;
        noSeed?: boolean;
        version?: string;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["db", "reset"];

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

    if (options.noSeed) {
        args.push("--no-seed");
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
 * ダンプオプションをコマンド引数に変換します
 */
function addDumpOptions(
    args: string[],
    options: {
        dataOnly?: boolean;
        dbUrl?: string;
        dryRun?: boolean;
        exclude?: string[];
        file?: string;
        keepComments?: boolean;
        linked?: boolean;
        local?: boolean;
        password?: string;
        roleOnly?: boolean;
        schema?: string[];
        useCopy?: boolean;
    }
): void {
    // 単純なブールオプション
    addBooleanOptions(args, options);

    // 文字列値オプション
    addStringOptions(args, options);

    // 配列オプション
    addArrayOptions(args, options);
}

/**
 * ブールオプションをコマンド引数に追加します
 */
function addBooleanOptions(args: string[], options: any): void {
    if (options.dataOnly) {
        args.push("--data-only");
    }
    if (options.dryRun) {
        args.push("--dry-run");
    }
    if (options.keepComments) {
        args.push("--keep-comments");
    }
    if (options.linked) {
        args.push("--linked");
    }
    if (options.local) {
        args.push("--local");
    }
    if (options.roleOnly) {
        args.push("--role-only");
    }
    if (options.useCopy) {
        args.push("--use-copy");
    }
}

/**
 * 文字列値オプションをコマンド引数に追加します
 */
function addStringOptions(args: string[], options: any): void {
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }
    if (options.file) {
        args.push("--file", options.file);
    }
    if (options.password) {
        args.push("--password", options.password);
    }
}

/**
 * 配列オプションをコマンド引数に追加します
 */
function addArrayOptions(args: string[], options: any): void {
    if (options.exclude) {
        for (const exclude of options.exclude) {
            args.push("--exclude", exclude);
        }
    }
    if (options.schema) {
        for (const schema of options.schema) {
            args.push("--schema", schema);
        }
    }
}

/**
 * グローバルフラグをコマンド引数に変換します
 */
function addGlobalFlags(args: string[], globalFlags: GlobalFlags): void {
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
}

/**
 * リモートデータベースからデータまたはスキーマをダンプします
 *
 * @param options - ダンプオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<string> - ダンプされた内容
 */
export async function dumpDatabase(
    options: {
        dataOnly?: boolean;
        dbUrl?: string;
        dryRun?: boolean;
        exclude?: string[];
        file?: string;
        keepComments?: boolean;
        linked?: boolean;
        local?: boolean;
        password?: string;
        roleOnly?: boolean;
        schema?: string[];
        useCopy?: boolean;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<string> {
    const args = ["db", "dump"];

    addDumpOptions(args, options);
    addGlobalFlags(args, globalFlags);

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);

    return result.stdout || "";
}

/**
 * 新しいマイグレーションをリモートデータベースにプッシュします
 *
 * @param options - プッシュオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function pushDatabase(
    options: {
        dbUrl?: string;
        dryRun?: boolean;
        includeAll?: boolean;
        includeRoles?: boolean;
        includeSeed?: boolean;
        linked?: boolean;
        local?: boolean;
        password?: string;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["db", "push"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.dryRun) {
        args.push("--dry-run");
    }

    if (options.includeAll) {
        args.push("--include-all");
    }

    if (options.includeRoles) {
        args.push("--include-roles");
    }

    if (options.includeSeed) {
        args.push("--include-seed");
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

    if (globalFlags.yes) {
        args.push("--yes");
    }

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);
}

/**
 * リモートデータベースからスキーマをプルします
 *
 * @param migrationName - マイグレーション名
 * @param options - プルオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function pullDatabase(
    migrationName?: string,
    options: DatabaseOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["db", "pull"];

    // マイグレーション名の追加（省略可能）
    if (migrationName) {
        args.push(migrationName);
    }

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

    if (options.schema) {
        for (const schema of options.schema) {
            args.push("--schema", schema);
        }
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
 * ローカルデータベースのスキーマ変更をdiffします
 *
 * @param options - diffオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<string> - diff結果
 */
export async function diffDatabase(
    options: {
        dbUrl?: string;
        file?: string;
        linked?: boolean;
        local?: boolean;
        schema?: string[];
        useMigra?: boolean;
        usePgSchema?: boolean;
        usePgadmin?: boolean;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<string> {
    const args = ["db", "diff"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.file) {
        args.push("--file", options.file);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    if (options.schema) {
        for (const schema of options.schema) {
            args.push("--schema", schema);
        }
    }

    if (options.useMigra) {
        args.push("--use-migra");
    }

    if (options.usePgSchema) {
        args.push("--use-pg-schema");
    }

    if (options.usePgadmin) {
        args.push("--use-pgadmin");
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

    return result.stdout || "";
}

/**
 * ローカルデータベースのタイピングエラーをチェックします
 *
 * @param options - lintオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<string> - lint結果
 */
export async function lintDatabase(
    options: {
        dbUrl?: string;
        failOn?: "none" | "warning" | "error";
        level?: "warning" | "error";
        linked?: boolean;
        local?: boolean;
        schema?: string[];
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<string> {
    const args = ["db", "lint"];

    // オプションの追加
    if (options.dbUrl) {
        args.push("--db-url", options.dbUrl);
    }

    if (options.failOn) {
        args.push("--fail-on", options.failOn);
    }

    if (options.level) {
        args.push("--level", options.level);
    }

    if (options.linked) {
        args.push("--linked");
    }

    if (options.local) {
        args.push("--local");
    }

    if (options.schema) {
        for (const schema of options.schema) {
            args.push("--schema", schema);
        }
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

    return result.stdout || "";
}

// EOF
