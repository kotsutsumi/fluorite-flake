/**
 * Turso CLI グループ関連ユーティリティ
 */

import { executeTursoCommand, throwOnError } from "./executor.js";
import type { CommandResult, GroupCreateOptions, GroupInfo } from "./types.js";

/**
 * グループ一覧を取得
 */
export async function listGroups(): Promise<GroupInfo[]> {
    const result = await executeTursoCommand(["group", "list"]);
    throwOnError(result, "turso group list");

    const lines =
        result.stdout?.split("\n").filter((line) => line.trim()) || [];
    const groups: GroupInfo[] = [];

    for (const line of lines) {
        // ヘッダー行をスキップ
        if (line.includes("Name") || line.includes("---")) {
            continue;
        }

        // グループ情報を抽出
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 1) {
            groups.push({
                name: parts[0],
            });
        }
    }

    return groups;
}

/**
 * グループを作成
 */
export async function createGroup(
    name: string,
    options: GroupCreateOptions = {}
): Promise<CommandResult> {
    const args = ["group", "create", name];

    if (options.location) {
        args.push("--location", options.location);
    }
    if (options.canary) {
        args.push("--canary");
    }
    if (options.wait) {
        args.push("--wait");
    }

    return await executeTursoCommand(args);
}

/**
 * グループを削除
 */
export async function destroyGroup(
    name: string,
    skipConfirmation = false
): Promise<CommandResult> {
    const args = ["group", "destroy", name];
    if (skipConfirmation) {
        args.push("--yes");
    }
    return await executeTursoCommand(args);
}

/**
 * グループを更新
 */
export async function updateGroup(
    name: string,
    options: {
        version?: string;
        extensions?: string;
        skipConfirmation?: boolean;
    } = {}
): Promise<CommandResult> {
    const args = ["group", "update", name];

    if (options.version) {
        args.push("--version", options.version);
    }
    if (options.extensions) {
        args.push("--extensions", options.extensions);
    }
    if (options.skipConfirmation) {
        args.push("--yes");
    }

    return await executeTursoCommand(args);
}

/**
 * グループを他の組織に移管
 */
export async function transferGroup(
    name: string,
    org: string,
    skipConfirmation = false
): Promise<CommandResult> {
    const args = ["group", "transfer", name, org];
    if (skipConfirmation) {
        args.push("--yes");
    }
    return await executeTursoCommand(args);
}

/**
 * グループにロケーション（レプリカ）を追加
 */
export async function addGroupLocation(
    name: string,
    location: string,
    wait = false
): Promise<CommandResult> {
    const args = ["group", "locations", "add", name, location];
    if (wait) {
        args.push("--wait");
    }
    return await executeTursoCommand(args);
}

/**
 * グループからロケーション（レプリカ）を削除
 */
export async function removeGroupLocation(
    name: string,
    location: string
): Promise<CommandResult> {
    return await executeTursoCommand([
        "group",
        "locations",
        "remove",
        name,
        location,
    ]);
}

/**
 * グループトークンを作成
 */
export async function createGroupToken(
    name: string,
    options: { expiration?: string; readOnly?: boolean } = {}
): Promise<CommandResult> {
    const args = ["group", "tokens", "create", name];

    if (options.expiration) {
        args.push("--expiration", options.expiration);
    }
    if (options.readOnly) {
        args.push("--read-only");
    }

    return await executeTursoCommand(args);
}

/**
 * グループトークンを無効化
 */
export async function invalidateGroupTokens(
    name: string,
    skipConfirmation = false
): Promise<CommandResult> {
    const args = ["group", "tokens", "invalidate", name];
    if (skipConfirmation) {
        args.push("--yes");
    }
    return await executeTursoCommand(args);
}

/**
 * グループをアーカイブ解除
 */
export async function unarchiveGroup(name: string): Promise<CommandResult> {
    return await executeTursoCommand(["group", "unarchive", name]);
}

/**
 * AWS移行情報を取得
 */
export async function getAwsMigrationInfo(
    name: string
): Promise<CommandResult> {
    return await executeTursoCommand(["group", "aws-migration", "info", name]);
}

/**
 * AWS移行を開始
 */
export async function startAwsMigration(name: string): Promise<CommandResult> {
    return await executeTursoCommand(["group", "aws-migration", "start", name]);
}

/**
 * AWS移行を中止
 */
export async function abortAwsMigration(name: string): Promise<CommandResult> {
    return await executeTursoCommand(["group", "aws-migration", "abort", name]);
}

// EOF
