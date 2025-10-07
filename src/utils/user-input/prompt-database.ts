/**
 * データベース選択プロンプト
 */
import { select } from "@clack/prompts";

import type { DatabaseType } from "../../commands/create/types.js";
import { getMessages } from "../../i18n.js";

/**
 * データベースタイプの選択プロンプトを表示
 */
export async function promptForDatabase(): Promise<DatabaseType | undefined> {
    const { create } = getMessages();

    const database = await select({
        message: create.selectDatabasePrompt,
        options: [
            {
                value: "turso" as const,
                label: "Turso - 高性能SQLiteベースのクラウドデータベース",
                hint: "本格的なアプリケーション向け",
            },
            {
                value: "supabase" as const,
                label: "Supabase - オープンソースのPostgreSQLベースのクラウドデータベース",
                hint: "リアルタイム機能とRLS付き",
            },
        ],
    });

    // ユーザーがキャンセルした場合
    if (typeof database === "symbol") {
        return;
    }

    return database;
}

// EOF
