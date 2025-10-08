/**
 * Supabase CLI プロジェクト管理ユーティリティ
 *
 * プロジェクトの作成、削除、一覧表示、API キー管理機能を提供します。
 */
import { executeSupabaseCommand, parseJsonResponse, throwOnError } from "./executor.js";
import type { GlobalFlags, ProjectCreateOptions, ProjectInfo } from "./types.js";

/**
 * 新しい Supabase プロジェクトを作成します
 *
 * @param projectName - プロジェクト名
 * @param options - プロジェクト作成オプション
 * @param globalFlags - グローバルフラグ
 * @returns Promise<ProjectInfo> - 作成されたプロジェクト情報
 */
export async function createProject(
    projectName: string,
    options: ProjectCreateOptions = {},
    globalFlags: GlobalFlags = {}
): Promise<ProjectInfo> {
    const args = ["projects", "create", projectName];

    // オプションの追加
    if (options.dbPassword) {
        args.push("--db-password", options.dbPassword);
    }

    if (options.orgId) {
        args.push("--org-id", options.orgId);
    }

    if (options.region) {
        args.push("--region", options.region);
    }

    if (options.size) {
        args.push("--size", options.size);
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

    // 出力フォーマットをJSONに設定
    args.push("--output", "json");

    const result = await executeSupabaseCommand(args);
    throwOnError(result, `supabase ${args.join(" ")}`);

    return parseJsonResponse<ProjectInfo>(result);
}

/**
 * Supabase プロジェクトを削除します
 *
 * @param projectRef - プロジェクト参照ID
 * @param globalFlags - グローバルフラグ
 * @returns Promise<void>
 */
export async function deleteProject(projectRef: string, globalFlags: GlobalFlags = {}): Promise<void> {
    const args = ["projects", "delete", projectRef];

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
 * ログインユーザーがアクセス可能なすべての Supabase プロジェクトを一覧表示します
 *
 * @param globalFlags - グローバルフラグ
 * @returns Promise<ProjectInfo[]> - プロジェクト情報の配列
 */
export async function listProjects(globalFlags: GlobalFlags = {}): Promise<ProjectInfo[]> {
    const args = ["projects", "list"];

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

    return parseJsonResponse<ProjectInfo[]>(result);
}

/**
 * Supabase プロジェクトのすべての API キーを一覧表示します
 *
 * @param projectRef - プロジェクト参照ID（指定しない場合はグローバルフラグから取得）
 * @param globalFlags - グローバルフラグ
 * @returns Promise<Record<string, string>> - API キーの辞書
 */
export async function getApiKeys(projectRef?: string, globalFlags: GlobalFlags = {}): Promise<Record<string, string>> {
    const args = ["projects", "api-keys"];

    // プロジェクト参照IDの追加
    if (projectRef) {
        args.push("--project-ref", projectRef);
    } else if (globalFlags.projectRef) {
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

    return parseJsonResponse<Record<string, string>>(result);
}

/**
 * プロジェクト情報を ID で検索します
 *
 * @param projectId - プロジェクト ID または参照 ID
 * @param globalFlags - グローバルフラグ
 * @returns Promise<ProjectInfo | null> - プロジェクト情報（見つからない場合は null）
 */
export async function getProjectById(projectId: string, globalFlags: GlobalFlags = {}): Promise<ProjectInfo | null> {
    const projects = await listProjects(globalFlags);

    const project = projects.find((p) => p.id === projectId || p.name === projectId);

    return project || null;
}

/**
 * プロジェクトが存在するかどうかを確認します
 *
 * @param projectId - プロジェクト ID または参照 ID
 * @param globalFlags - グローバルフラグ
 * @returns Promise<boolean> - プロジェクトが存在するかどうか
 */
export async function projectExists(projectId: string, globalFlags: GlobalFlags = {}): Promise<boolean> {
    try {
        const project = await getProjectById(projectId, globalFlags);
        return project !== null;
    } catch {
        return false;
    }
}

// EOF
