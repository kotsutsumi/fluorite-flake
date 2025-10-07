/**
 * libsqlクライアント接続テスト - 実際のtest8データベースへの接続確認
 */

import { createClient } from "@libsql/client";

async function testConnection() {
    console.log("🔍 実際のTursoデータベース接続テスト開始");

    // 実際のtest8-devデータベースの情報
    const tursoUrl =
        "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io";

    // 環境変数からトークンを取得
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!authToken) {
        console.error("❌ TURSO_AUTH_TOKEN環境変数が設定されていません");
        process.exit(1);
    }

    console.log(`📍 接続先URL: ${tursoUrl}`);
    console.log(`🔑 認証トークン長: ${authToken.length}`);

    try {
        // libsqlクライアントを作成
        const client = createClient({
            url: tursoUrl,
            authToken,
        });

        console.log("✅ libsqlクライアント作成成功");

        // 基本的な接続テスト
        console.log("🔍 SELECT 1 テスト実行中...");
        const result1 = await client.execute("SELECT 1 as test");
        console.log("✅ SELECT 1 テスト成功:", result1);

        // データベース情報の確認
        console.log("🔍 データベース情報確認中...");
        const dbInfo = await client.execute(
            "SELECT sqlite_version() as sqlite_version"
        );
        console.log("✅ データベース情報:", dbInfo);

        // 既存テーブルの確認
        console.log("🔍 既存テーブル確認中...");
        const tables = await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log("📋 既存テーブル:", tables);

        // 簡単なテーブル作成テスト
        console.log("🔍 テーブル作成テスト実行中...");
        const createResult = await client.execute(`
            CREATE TABLE IF NOT EXISTS connection_test (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                test_value TEXT
            )
        `);
        console.log("✅ テーブル作成テスト成功:", createResult);

        // テストデータ挿入
        console.log("🔍 テストデータ挿入中...");
        const insertResult = await client.execute(`
            INSERT INTO connection_test (test_value) VALUES ('test-${Date.now()}')
        `);
        console.log("✅ データ挿入成功:", insertResult);

        // データ取得テスト
        console.log("🔍 データ取得テスト実行中...");
        const selectResult = await client.execute(
            "SELECT * FROM connection_test ORDER BY id DESC LIMIT 1"
        );
        console.log("✅ データ取得成功:", selectResult);

        console.log("🎉 全ての接続テストが成功しました！");
    } catch (error) {
        console.error("❌ 接続テスト失敗:", error);
        console.error("   エラーメッセージ:", error.message);
        console.error("   エラースタック:", error.stack);
        process.exit(1);
    }
}

testConnection().catch(console.error);

// EOF
