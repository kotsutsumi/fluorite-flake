/**
 * Turso CLI データベース関連ユーティリティ
 */
import { executeTursoCommand, throwOnError } from "./executor.js";
import type {
    CommandResult,
    DatabaseCreateOptions,
    DatabaseInfo,
    DatabaseToken,
} from "./types.js";

/**
 * データベース一覧を取得
 */
export async function listDatabases(group?: string): Promise<DatabaseInfo[]> {
    const args = ["db", "list"];
    if (group) {
        args.push("--group", group);
    }

    const result = await executeTursoCommand(args);
    throwOnError(result, "turso db list");

    // 出力をパースしてデータベース一覧を作成
    const lines =
        result.stdout?.split("\n").filter((line) => line.trim()) || [];
    const databases: DatabaseInfo[] = [];

    for (const line of lines) {
        // ヘッダー行をスキップ (NAME, GROUP, URLを含む行)
        if (
            line.includes("NAME") &&
            line.includes("GROUP") &&
            line.includes("URL")
        ) {
            continue;
        }

        // データベース情報を抽出（固定幅フォーマットを解析）
        // 形式: NAME                       GROUP      URL
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith("-")) {
            // 固定幅フォーマットをパース
            const nameMatch = trimmedLine.match(/^(\S+)/);
            const urlMatch = trimmedLine.match(/(libsql:\/\/[^\s]+)/);

            if (nameMatch) {
                const name = nameMatch[1];
                // グループは名前とURLの間にある部分から抽出
                const afterName = trimmedLine.substring(name.length).trim();
                const groupMatch = afterName.match(/^(\S+)/);
                const dbGroup = groupMatch ? groupMatch[1] : "default";
                const url = urlMatch ? urlMatch[1] : undefined;

                databases.push({
                    name,
                    url,
                    group: dbGroup,
                });
            }
        }
    }

    return databases;
}

/**
 * データベースを作成
 */
export async function createDatabase(
    name: string,
    options: DatabaseCreateOptions = {}
): Promise<CommandResult> {
    const args = ["db", "create", name];

    // オプションの追加
    if (options.group) {
        args.push("--group", options.group);
    }
    if (options.fromFile) {
        args.push("--from-file", options.fromFile);
    }
    if (options.fromDump) {
        args.push("--from-dump", options.fromDump);
    }
    if (options.fromCsv) {
        args.push("--from-csv", options.fromCsv);
    }
    if (options.timestamp) {
        args.push("--timestamp", options.timestamp);
    }
    if (options.enableExtensions) {
        args.push("--enable-extensions");
    }
    if (options.sizeLimit) {
        args.push("--size-limit", options.sizeLimit);
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
 * データベースを削除
 */
export async function destroyDatabase(
    name: string,
    skipConfirmation = false
): Promise<CommandResult> {
    const args = ["db", "destroy", name];
    if (skipConfirmation) {
        args.push("--yes");
    }
    return await executeTursoCommand(args);
}

/**
 * データベース情報を表示
 */
export async function showDatabase(name: string): Promise<DatabaseInfo> {
    const result = await executeTursoCommand(["db", "show", name]);
    throwOnError(result, "turso db show");

    // 出力からデータベース情報を抽出
    const lines = result.stdout?.split("\n") || [];
    const info: DatabaseInfo = { name };

    for (const line of lines) {
        if (line.includes("URL:") && !line.includes("HTTP URL:")) {
            info.url = line.split(":").slice(1).join(":").trim();
        }
        if (line.includes("HTTP URL:")) {
            info.httpUrl = line.split(":").slice(1).join(":").trim();
        }
        if (line.includes("Group:")) {
            info.group = line.split(":")[1]?.trim();
        }
    }

    return info;
}

/**
 * データベースのURL情報を取得
 */
export async function getDatabaseUrl(
    name: string,
    httpUrl = false
): Promise<string> {
    const args = ["db", "show", name];
    if (httpUrl) {
        args.push("--http-url");
    } else {
        args.push("--url");
    }

    const result = await executeTursoCommand(args);
    throwOnError(result, "turso db show");

    return result.stdout?.trim() || "";
}

/**
 * 利用可能なロケーション一覧を取得
 */
export async function getLocations(
    showLatencies = false
): Promise<CommandResult> {
    const args = ["db", "locations"];
    if (showLatencies) {
        args.push("--show-latencies");
    }
    return await executeTursoCommand(args);
}

/**
 * データベースシェルを実行
 */
export async function shellDatabase(
    name: string,
    sql?: string,
    options: { instance?: string; location?: string; proxy?: boolean } = {}
): Promise<CommandResult> {
    const args = ["db", "shell", name];

    if (sql) {
        args.push(sql);
    }

    if (options.instance) {
        args.push("--instance", options.instance);
    }
    if (options.location) {
        args.push("--location", options.location);
    }
    if (options.proxy) {
        args.push("--proxy");
    }

    return await executeTursoCommand(args);
}

/**
 * データベース使用量を確認
 */
export async function inspectDatabase(
    name: string,
    options: { queries?: boolean; verbose?: boolean } = {}
): Promise<CommandResult> {
    const args = ["db", "inspect", name];

    if (options.queries) {
        args.push("--queries");
    }
    if (options.verbose) {
        args.push("--verbose");
    }

    return await executeTursoCommand(args);
}

/**
 * データベースをインポート
 */
export async function importDatabase(
    file: string,
    group?: string
): Promise<CommandResult> {
    const args = ["db", "import", file];
    if (group) {
        args.push("--group", group);
    }
    return await executeTursoCommand(args);
}

/**
 * データベースをエクスポート
 */
export async function exportDatabase(
    name: string,
    options: {
        outputFile?: string;
        overwrite?: boolean;
        withMetadata?: boolean;
    } = {}
): Promise<CommandResult> {
    const args = ["db", "export", name];

    if (options.outputFile) {
        args.push("--output-file", options.outputFile);
    }
    if (options.overwrite) {
        args.push("--overwrite");
    }
    if (options.withMetadata) {
        args.push("--with-metadata");
    }

    return await executeTursoCommand(args);
}

/**
 * データベーストークンを作成
 */
export async function createDatabaseToken(
    name: string,
    options: { expiration?: string; readOnly?: boolean } = {}
): Promise<DatabaseToken> {
    const args = ["db", "tokens", "create", name];

    if (options.expiration) {
        args.push("--expiration", options.expiration);
    }
    if (options.readOnly) {
        args.push("--read-only");
    }

    const result = await executeTursoCommand(args);
    throwOnError(result, "turso db tokens create");

    return {
        token: result.stdout?.trim() || "",
        readOnly: options.readOnly,
    };
}

/**
 * データベーストークンを無効化
 */
export async function invalidateDatabaseTokens(
    name: string,
    skipConfirmation = false
): Promise<CommandResult> {
    const args = ["db", "tokens", "invalidate", name];
    if (skipConfirmation) {
        args.push("--yes");
    }
    return await executeTursoCommand(args);
}

/**
 * データベースをアーカイブ解除
 */
export async function unarchiveDatabase(name: string): Promise<CommandResult> {
    return await executeTursoCommand(["db", "unarchive", name]);
}

// EOF
