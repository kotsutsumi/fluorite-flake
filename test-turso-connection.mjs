/**
 * Turso接続テスト - template projectのnode_modulesを使用
 */

import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const templatePath = resolve("./templates/nextjs-fullstack-admin");

// テンプレートプロジェクトのnode_modulesから@libsql/clientを読み込み
let libsqlModule;
try {
    const requireFromTemplate = createRequire(
        resolve(templatePath, "package.json")
    );
    libsqlModule = requireFromTemplate("@libsql/client");
    console.log("✅ @libsql/client読み込み成功");
} catch (error) {
    console.error("❌ @libsql/client読み込み失敗:", error.message);
    console.log("💡 template projectでnpm installを実行してください");
    process.exit(1);
}

async function testConnection() {
    console.log("🔍 実際のTursoデータベース接続テスト開始");

    // 実際のtest8-devデータベースの情報
    const tursoUrl =
        "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io";

    // 環境変数からトークンを取得
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!authToken) {
        console.error("❌ TURSO_AUTH_TOKEN環境変数が設定されていません");
        console.log("💡 以下のコマンドでトークンを設定してください:");
        console.log("   export TURSO_AUTH_TOKEN=your_token_here");
        process.exit(1);
    }

    console.log(`📍 接続先URL: ${tursoUrl}`);
    console.log(`🔑 認証トークン長: ${authToken.length}`);

    try {
        // libsqlクライアントを作成
        const client = libsqlModule.createClient({
            url: tursoUrl,
            authToken,
        });

        console.log("✅ libsqlクライアント作成成功");

        // 基本的な接続テスト
        console.log("🔍 SELECT 1 テスト実行中...");
        const result1 = await client.execute("SELECT 1 as test");
        console.log(
            "✅ SELECT 1 テスト成功:",
            JSON.stringify(result1, null, 2)
        );

        // データベース情報の確認
        console.log("🔍 データベース情報確認中...");
        const dbInfo = await client.execute(
            "SELECT sqlite_version() as sqlite_version"
        );
        console.log("✅ データベース情報:", JSON.stringify(dbInfo, null, 2));

        // 既存テーブルの確認
        console.log("🔍 既存テーブル確認中...");
        const tables = await client.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        );
        console.log("📋 既存テーブル:", JSON.stringify(tables, null, 2));

        // 簡単なテーブル作成テスト
        console.log("🔍 テーブル作成テスト実行中...");
        const createResult = await client.execute(`
            CREATE TABLE IF NOT EXISTS connection_test (
                id TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                test_value TEXT
            )
        `);
        console.log(
            "✅ テーブル作成テスト成功:",
            JSON.stringify(createResult, null, 2)
        );

        // テストデータ挿入
        const testId = `test-${Date.now()}`;
        console.log(`🔍 テストデータ挿入中... (ID: ${testId})`);
        const insertResult = await client.execute(
            `
            INSERT INTO connection_test (id, test_value) VALUES (?, ?)
        `,
            [testId, `test-value-${Date.now()}`]
        );
        console.log(
            "✅ データ挿入成功:",
            JSON.stringify(insertResult, null, 2)
        );

        // データ取得テスト
        console.log("🔍 データ取得テスト実行中...");
        const selectResult = await client.execute(
            "SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 3"
        );
        console.log(
            "✅ データ取得成功:",
            JSON.stringify(selectResult, null, 2)
        );

        console.log("🎉 全ての接続テストが成功しました！");

        // クライアントを閉じる
        if (typeof client.close === "function") {
            await client.close();
            console.log("✅ クライアント接続を閉じました");
        }
    } catch (error) {
        console.error("❌ 接続テスト失敗:", error);
        console.error("   エラーメッセージ:", error.message);
        console.error("   エラースタック:", error.stack);

        // エラーの詳細を分析
        if (error.message.includes("URL_INVALID")) {
            console.error("🔍 URL_INVALID エラーの詳細分析:");
            console.error("   使用URL:", tursoUrl);
            console.error("   URLタイプ:", typeof tursoUrl);
            console.error("   URL解析テスト:");
            try {
                const parsed = new URL(tursoUrl);
                console.error("     プロトコル:", parsed.protocol);
                console.error("     ホスト:", parsed.host);
                console.error("     パス:", parsed.pathname);
                console.error("     クエリ:", parsed.search);
            } catch (urlError) {
                console.error("     URL解析エラー:", urlError.message);
            }
        }

        process.exit(1);
    }
}

testConnection().catch(console.error);

// EOF
