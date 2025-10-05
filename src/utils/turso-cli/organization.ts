/**
 * Turso CLI 組織関連ユーティリティ
 */

import { executeTursoCommand, throwOnError } from "./executor.js";
import type { CommandResult, MemberInfo, OrganizationInfo } from "./types.js";

/**
 * 所属組織一覧を取得
 */
export async function listOrganizations(): Promise<OrganizationInfo[]> {
    const result = await executeTursoCommand(["org", "list"]);
    throwOnError(result, "turso org list");

    const lines =
        result.stdout?.split("\n").filter((line) => line.trim()) || [];
    const organizations: OrganizationInfo[] = [];

    for (const line of lines) {
        // ヘッダー行をスキップ
        if (line.includes("Name") || line.includes("---")) {
            continue;
        }

        // 組織情報を抽出
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
            organizations.push({
                slug: parts[0],
                name: parts.slice(1).join(" "),
            });
        }
    }

    return organizations;
}

/**
 * 新規組織を作成
 */
export async function createOrganization(name: string): Promise<CommandResult> {
    return await executeTursoCommand(["org", "create", name]);
}

/**
 * アクティブ組織を切り替え
 */
export async function switchOrganization(slug: string): Promise<CommandResult> {
    return await executeTursoCommand(["org", "switch", slug]);
}

/**
 * 組織を削除
 */
export async function destroyOrganization(
    slug: string
): Promise<CommandResult> {
    return await executeTursoCommand(["org", "destroy", slug]);
}

/**
 * 組織メンバー一覧を取得
 */
export async function listMembers(): Promise<MemberInfo[]> {
    const result = await executeTursoCommand(["org", "members", "list"]);
    throwOnError(result, "turso org members list");

    const lines =
        result.stdout?.split("\n").filter((line) => line.trim()) || [];
    const members: MemberInfo[] = [];

    for (const line of lines) {
        // ヘッダー行をスキップ
        if (line.includes("Username") || line.includes("---")) {
            continue;
        }

        // メンバー情報を抽出
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1) {
            members.push({
                username: parts[0],
                role: (parts[1] as "admin" | "member") || "member",
            });
        }
    }

    return members;
}

/**
 * 既存ユーザーを組織に追加
 */
export async function addMember(
    username: string,
    isAdmin = false
): Promise<CommandResult> {
    const args = ["org", "members", "add", username];
    if (isAdmin) {
        args.push("--admin");
    }
    return await executeTursoCommand(args);
}

/**
 * 非登録ユーザーを組織に招待
 */
export async function inviteMember(
    email: string,
    isAdmin = false
): Promise<CommandResult> {
    const args = ["org", "members", "invite", email];
    if (isAdmin) {
        args.push("--admin");
    }
    return await executeTursoCommand(args);
}

/**
 * メンバーを組織から削除
 */
export async function removeMember(username: string): Promise<CommandResult> {
    return await executeTursoCommand(["org", "members", "rm", username]);
}

// EOF
