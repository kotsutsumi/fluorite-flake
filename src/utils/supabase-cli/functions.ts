/**
 * Supabase CLI Edge Functions 管理ユーティリティ
 *
 * Edge Functions の作成、デプロイ、削除、一覧表示機能を提供します。
 */

import {
    executeSupabaseCommand,
    parseJsonResponse,
    throwOnError,
} from "./executor.js";
import type {
    FunctionDeployOptions,
    FunctionInfo,
    GlobalFlags,
} from "./types.js";

/**
 * 新しい Edge Function をローカルに作成します
 *
 * @param functionName - Function 名
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function createFunction(
    functionName: string,
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["functions", "new", functionName];

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
 * Edge Function をリンクされた Supabase プロジェクトにデプロイします
 *
 * @param functionName - Function 名（指定しない場合は全ての Functions をデプロイ）
 * @param options - デプロイオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function deployFunction(
    functionName?: string,
    options: FunctionDeployOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["functions", "deploy"];

    // Function 名の追加（省略可能）
    if (functionName) {
        args.push(functionName);
    }

    // オプションの追加
    if (options.importMap) {
        args.push("--import-map", options.importMap);
    }

    if (options.jobs) {
        args.push("--jobs", options.jobs.toString());
    }

    if (options.noVerifyJwt) {
        args.push("--no-verify-jwt");
    }

    if (options.prune) {
        args.push("--prune");
    }

    if (options.useApi) {
        args.push("--use-api");
    }

    if (options.useDocker !== undefined && options.useDocker) {
        args.push("--use-docker");
    }

    // プロジェクト参照IDの追加
    if (globalFlags.projectRef) {
        args.push("--project-ref", globalFlags.projectRef);
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
 * リンクされた Supabase プロジェクトから Edge Function を削除します
 *
 * @param functionName - Function 名
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function deleteFunction(
    functionName: string,
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["functions", "delete", functionName];

    // プロジェクト参照IDの追加
    if (globalFlags.projectRef) {
        args.push("--project-ref", globalFlags.projectRef);
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
 * リンクされた Supabase プロジェクトのすべての Edge Functions を一覧表示します
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<FunctionInfo[]> - Function 情報の配列
 */
export async function listFunctions(
    globalFlags: GlobalFlags = {}
): Promise<FunctionInfo[]> {
    const args = ["functions", "list"];

    // プロジェクト参照IDの追加
    if (globalFlags.projectRef) {
        args.push("--project-ref", globalFlags.projectRef);
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

    return parseJsonResponse<FunctionInfo[]>(result);
}

/**
 * リンクされた Supabase プロジェクトから Edge Function のソースコードをダウンロードします
 *
 * @param functionName - Function 名
 * @param options - ダウンロードオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function downloadFunction(
    functionName: string,
    options: { legacyBundle?: boolean } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["functions", "download", functionName];

    // オプションの追加
    if (options.legacyBundle) {
        args.push("--legacy-bundle");
    }

    // プロジェクト参照IDの追加
    if (globalFlags.projectRef) {
        args.push("--project-ref", globalFlags.projectRef);
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
 * すべての Edge Functions をローカルでサーブします
 *
 * @param options - サーブオプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function serveFunctions(
    options: {
        envFile?: string;
        importMap?: string;
        inspect?: boolean;
        inspectMain?: boolean;
        inspectMode?: "run" | "brk" | "wait";
        noVerifyJwt?: boolean;
    } = {},
    globalFlags: GlobalFlags = {}
): Promise<void> {
    const args = ["functions", "serve"];

    // オプションの追加
    if (options.envFile) {
        args.push("--env-file", options.envFile);
    }

    if (options.importMap) {
        args.push("--import-map", options.importMap);
    }

    if (options.inspect) {
        args.push("--inspect");
    }

    if (options.inspectMain) {
        args.push("--inspect-main");
    }

    if (options.inspectMode) {
        args.push("--inspect-mode", options.inspectMode);
    }

    if (options.noVerifyJwt) {
        args.push("--no-verify-jwt");
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
 * 指定された Function が存在するかどうかを確認します
 *
 * @param functionName - Function 名
 * @param globalFlags - グローバルフラグ
 * @returns Promise<boolean> - Function が存在するかどうか
 */
export async function functionExists(
    functionName: string,
    globalFlags: GlobalFlags = {}
): Promise<boolean> {
    try {
        const functions = await listFunctions(globalFlags);
        return functions.some((func) => func.name === functionName);
    } catch {
        return false;
    }
}

// EOF
