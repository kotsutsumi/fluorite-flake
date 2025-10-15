/**
 * Tursoデータベース向けにテーブル作成とシード投入を行う関数を定義する
 */
import { join } from "node:path"; // パス連結のためにnode:pathからjoinを読み込む

import type { ProjectConfig } from "../types.js"; // プロジェクト設定の型情報を取り込む
import type { DatabaseCredentials } from "../database-provisioning/types.js"; // データベース資格情報の型をインポートする

/**
 * 指定されたTursoデータベースにテーブルを作成し必要に応じてシードデータを投入する
 */
export async function createTursoTables(config: ProjectConfig, credentials: DatabaseCredentials): Promise<void> {
    try {
        // 遅延インポートでTursoのプロビジョニングロジックを読み込む
        const { createTablesInTursoDatabases, seedTursoDatabases } = await import(
            "../../../utils/turso-cli/provisioning.js"
        );

        // モノレポ構成かどうかでアプリケーションディレクトリを切り替える
        const appDirectory = config.monorepo ? join(config.directory, "apps", "web") : config.directory;

        // 3環境分のテーブル作成処理を順番に実行する
        await createTablesInTursoDatabases(appDirectory, credentials, ["dev", "staging", "prod"]);

        // 開発とステージング環境にシードデータを投入する
        await seedTursoDatabases(appDirectory, credentials, ["dev", "staging"]);

        // 成功時は進捗メッセージを表示する
        console.log("✅ Tursoクラウドデータベースのテーブル作成が完了しました");
    } catch (error) {
        // 例外発生時は詳細を出力して呼び出し元へ再送する
        console.error(
            `❌ Tursoクラウドデータベースのテーブル作成に失敗: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

// EOF
