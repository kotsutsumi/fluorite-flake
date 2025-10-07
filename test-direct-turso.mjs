#!/usr/bin/env node

/**
 * Turso直接接続テスト - 実際のクラウドデータベースでの動作確認
 *
 * URL_INVALIDエラーの根本原因を特定し、確実に動作する修正を行います。
 */

// 実際のTurso認証情報
const TURSO_CREDENTIALS = {
    dev: {
        url: "libsql://test1234-dev-kotsutsumi.aws-ap-northeast-1.turso.io",
        token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTk4NzE1ODIsImlkIjoiYmZiMDcwMjgtMGZlMC00MGY3LTlmYzUtYjE2NzMwMDZmZjZhIiwicmlkIjoiZDJmMjAzMmQtYWQ1MS00YWFmLTgzNTYtN2U0YjcyN2M4ZmM2In0.j1bULrMye7GyEjlTe2Lz3I8Sfmh7Iz6GYOrGLFIly55eZ-B-BSlmb0YgTVJ0Xw9LB9OghPE8jsaFy6J-i2ioBg",
    },
    staging: {
        url: "libsql://test1234-stg-kotsutsumi.aws-ap-northeast-1.turso.io",
        token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTk4NzE1ODIsImlkIjoiMDM4OWFlZTgtY2E3YS00MzIwLTk2NGQtZWY0ZDk5NTNjODkyIiwicmlkIjoiY2QxZmRhOGQtYjQ5My00OTAwLWEyZWMtMmE5N2UzZWM5ZjFkIn0.6URNBJv1Y_t1M3PCrqlyiFOwSiecw0D6DjdKEu8635EY-a7s-GyZtuOapEwXQlL6euJp-WC4OOkCOF_SaAxqAg",
    },
    prod: {
        url: "libsql://test1234-prod-kotsutsumi.aws-ap-northeast-1.turso.io",
        token: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTk4NzE1ODIsImlkIjoiMGUzMWMyYWItMjQ4YS00ZTEyLTk3YTQtZjQ1YjQ5ZTJjOWVhIiwicmlkIjoiM2UxYzk5YzMtMDNjNi00Y2ZlLThmZDQtMzA4ZDEwMmZjMWJlIn0.pBokQiv8BYM0BCZj5KwhNQf1oiaUFs8Y1TSUpyLTNlEuC4_rz8UPF5RC0PXVrNhtq144HVTHEs8M4WXzvITrCw",
    },
};

/**
 * 認証情報の詳細検証
 */
function validateCredentials(env, credentials) {
    console.log(`\n🔍 ${env}環境 認証情報検証:`);

    const url = credentials.url;
    const token = credentials.token;

    // URL検証
    console.log(`   URL: ${url}`);
    console.log(`   URL定義状況: ${url ? "OK" : "NG - undefined"}`);
    console.log(
        `   URL形式: ${url?.startsWith("libsql://") ? "OK" : "NG - libsql://で開始していない"}`
    );
    console.log(`   URL長: ${url?.length || 0}文字`);

    // トークン検証
    console.log(
        `   Token: ${token ? `${token.substring(0, 20)}...` : "undefined"}`
    );
    console.log(`   Token定義状況: ${token ? "OK" : "NG - undefined"}`);
    console.log(`   Token長: ${token?.length || 0}文字`);
    console.log(
        `   Token形式: ${token?.startsWith("eyJ") ? "OK (JWT形式)" : "NG - JWT形式ではない"}`
    );

    return !!(
        url &&
        token &&
        url.startsWith("libsql://") &&
        token.startsWith("eyJ")
    );
}

/**
 * libsqlクライアント直接テスト
 */
async function testDirectLibsql(env, credentials) {
    console.log(`\n📡 ${env}環境 libsql直接接続テスト:`);

    try {
        // 動的インポート（実際のプロジェクト環境でないため）
        const libsql = await import("@libsql/client");

        const client = libsql.createClient({
            url: credentials.url,
            authToken: credentials.token,
        });

        console.log("   クライアント作成: ✅");

        // 基本接続テスト
        const result = await client.execute(
            'SELECT 1 as test, datetime("now") as timestamp'
        );
        console.log("   基本接続: ✅");
        console.log(`   レスポンス: ${JSON.stringify(result.rows[0])}`);

        // テーブル一覧確認
        const tables = await client.execute(
            'SELECT name FROM sqlite_master WHERE type="table"'
        );
        console.log(`   既存テーブル数: ${tables.rows.length}`);

        // テストテーブル作成
        await client.execute(`
            CREATE TABLE IF NOT EXISTS test_connection_${env} (
                id TEXT PRIMARY KEY,
                message TEXT,
                env TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("   テストテーブル作成: ✅");

        // データ挿入
        await client.execute(`
            INSERT OR REPLACE INTO test_connection_${env} (id, message, env)
            VALUES ('test-${Date.now()}', 'Direct connection test', '${env}')
        `);
        console.log("   データ挿入: ✅");

        // データ確認
        const data = await client.execute(
            `SELECT * FROM test_connection_${env} ORDER BY created_at DESC LIMIT 1`
        );
        console.log("   データ確認: ✅");
        console.log(`   挿入データ: ${JSON.stringify(data.rows[0])}`);

        // クリーンアップ
        await client.execute(`DROP TABLE test_connection_${env}`);
        console.log("   クリーンアップ: ✅");

        await client.close();
        return true;
    } catch (error) {
        console.error(`   ❌ 失敗: ${error.message}`);

        if (error.message.includes("URL_INVALID")) {
            console.error("   🔍 URL_INVALIDエラー詳細:");
            console.error(`      URL: "${credentials.url}"`);
            console.error(
                `      Token: "${credentials.token?.substring(0, 20)}..."`
            );
        }

        return false;
    }
}

/**
 * 環境変数シミュレーションテスト
 */
async function testEnvironmentVariables(env, credentials) {
    console.log(`\n🌍 ${env}環境 環境変数シミュレーションテスト:`);

    // 元の環境変数を保存
    const originalEnv = {
        DATABASE_URL: process.env.DATABASE_URL,
        TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
        TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
        PRISMA_DATABASE_URL: process.env.PRISMA_DATABASE_URL,
    };

    try {
        // テスト用環境変数を設定
        process.env.DATABASE_URL = `${credentials.url}?authToken=${credentials.token}`;
        process.env.TURSO_AUTH_TOKEN = credentials.token;
        process.env.TURSO_DATABASE_URL = credentials.url;
        process.env.PRISMA_DATABASE_URL = `${credentials.url}?authToken=${credentials.token}`;

        console.log(
            `   DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "undefined"}`
        );
        console.log(
            `   TURSO_AUTH_TOKEN: ${process.env.TURSO_AUTH_TOKEN ? "SET" : "undefined"}`
        );
        console.log(
            `   TURSO_DATABASE_URL: ${process.env.TURSO_DATABASE_URL ? "SET" : "undefined"}`
        );
        console.log(
            `   PRISMA_DATABASE_URL: ${process.env.PRISMA_DATABASE_URL ? "SET" : "undefined"}`
        );

        // provisioning.tsのURL取得ロジックをシミュレート
        const rawTursoUrl =
            process.env.TURSO_DATABASE_URL ||
            process.env.DATABASE_URL ||
            process.env.PRISMA_DATABASE_URL;

        console.log(`   Raw URL取得: ${rawTursoUrl ? "OK" : "NG"}`);

        // cleanDatabaseUrl関数のシミュレート
        function cleanDatabaseUrl(url) {
            if (!url) {
                return url;
            }
            try {
                const parsedUrl = new URL(url);
                return `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}`;
            } catch (error) {
                console.warn(`URL解析失敗: ${url}`, error.message);
                return url;
            }
        }

        const cleanUrl = cleanDatabaseUrl(rawTursoUrl);
        console.log(`   Clean URL: ${cleanUrl}`);

        const authToken =
            process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
        console.log(`   Auth Token: ${authToken ? "OK" : "NG"}`);

        if (cleanUrl && authToken) {
            console.log("   🎯 必要な値が全て取得できました");

            // 実際の接続テスト
            const libsql = await import("@libsql/client");
            const client = libsql.createClient({
                url: cleanUrl,
                authToken,
            });

            const result = await client.execute("SELECT 1 as env_test");
            console.log("   環境変数経由接続: ✅");
            await client.close();

            return true;
        }
        console.error("   ❌ 必要な値が取得できませんでした");
        return false;
    } catch (error) {
        console.error(`   ❌ 環境変数テスト失敗: ${error.message}`);
        return false;
    } finally {
        // 環境変数を復元
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

/**
 * 本格的なテーブル作成テスト
 */
async function testFullTableCreation(env, credentials) {
    console.log(`\n🗄️ ${env}環境 本格テーブル作成テスト:`);

    try {
        const libsql = await import("@libsql/client");
        const client = libsql.createClient({
            url: credentials.url,
            authToken: credentials.token,
        });

        // 実際のスキーマに基づくテーブル作成
        const tables = [
            {
                name: "User",
                sql: `
                    CREATE TABLE IF NOT EXISTS User (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE NOT NULL,
                        emailVerified INTEGER DEFAULT 0,
                        name TEXT,
                        image TEXT,
                        role TEXT DEFAULT 'user',
                        MemberId TEXT UNIQUE,
                        memberSince DATETIME,
                        metadata TEXT,
                        isActive INTEGER DEFAULT 1,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `,
            },
            {
                name: "Post",
                sql: `
                    CREATE TABLE IF NOT EXISTS Post (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        content TEXT,
                        published INTEGER DEFAULT 0,
                        authorId TEXT NOT NULL,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (authorId) REFERENCES User(id) ON DELETE CASCADE
                    )
                `,
            },
            {
                name: "Organization",
                sql: `
                    CREATE TABLE IF NOT EXISTS Organization (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        slug TEXT UNIQUE NOT NULL,
                        metadata TEXT,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `,
            },
        ];

        // テーブル作成実行
        for (const table of tables) {
            console.log(`   ${table.name}テーブル作成中...`);
            await client.execute(table.sql);
            console.log(`   ${table.name}テーブル: ✅`);
        }

        // シードデータ投入テスト
        console.log("   シードデータ投入中...");

        // 組織作成
        await client.execute(`
            INSERT OR REPLACE INTO Organization (id, name, slug, metadata)
            VALUES ('org-test-${env}', 'テスト組織 ${env}', 'test-org-${env}', '{"env": "${env}"}')
        `);

        // ユーザー作成
        await client.execute(`
            INSERT OR REPLACE INTO User (id, email, name, role, isActive)
            VALUES ('user-test-${env}', 'test-${env}@example.com', 'テストユーザー ${env}', 'admin', 1)
        `);

        // 投稿作成
        await client.execute(`
            INSERT OR REPLACE INTO Post (id, title, content, published, authorId)
            VALUES ('post-test-${env}', 'テスト投稿 ${env}', 'テスト内容 ${env}', 1, 'user-test-${env}')
        `);

        console.log("   シードデータ: ✅");

        // データ確認
        const userCount = await client.execute(
            "SELECT COUNT(*) as count FROM User"
        );
        const postCount = await client.execute(
            "SELECT COUNT(*) as count FROM Post"
        );
        const orgCount = await client.execute(
            "SELECT COUNT(*) as count FROM Organization"
        );

        console.log("   作成データ確認:");
        console.log(`     ユーザー: ${userCount.rows[0].count}件`);
        console.log(`     投稿: ${postCount.rows[0].count}件`);
        console.log(`     組織: ${orgCount.rows[0].count}件`);

        await client.close();
        return true;
    } catch (error) {
        console.error(`   ❌ テーブル作成失敗: ${error.message}`);
        return false;
    }
}

/**
 * メイン実行
 */
async function main() {
    console.log("🧪 Turso実環境接続テスト開始");
    console.log("=" * 60);

    const environments = ["dev", "staging", "prod"];
    const results = {
        validation: {},
        direct: {},
        environment: {},
        tables: {},
    };

    // 各環境でテスト実行
    for (const env of environments) {
        const credentials = TURSO_CREDENTIALS[env];

        console.log(`\n📋 ${env.toUpperCase()}環境テスト開始`);
        console.log("=" * 40);

        // 1. 認証情報検証
        results.validation[env] = validateCredentials(env, credentials);

        if (!results.validation[env]) {
            console.log(
                `⚠️ ${env}環境: 認証情報に問題があります。スキップします。`
            );
            continue;
        }

        // 2. 直接接続テスト
        results.direct[env] = await testDirectLibsql(env, credentials);

        // 3. 環境変数シミュレーション
        results.environment[env] = await testEnvironmentVariables(
            env,
            credentials
        );

        // 4. 本格テーブル作成テスト
        results.tables[env] = await testFullTableCreation(env, credentials);

        console.log(`\n📊 ${env.toUpperCase()}環境結果:`);
        console.log(`   認証情報: ${results.validation[env] ? "✅" : "❌"}`);
        console.log(`   直接接続: ${results.direct[env] ? "✅" : "❌"}`);
        console.log(`   環境変数: ${results.environment[env] ? "✅" : "❌"}`);
        console.log(`   テーブル作成: ${results.tables[env] ? "✅" : "❌"}`);
    }

    // 総合結果
    console.log("\n🎯 総合テスト結果");
    console.log("=" * 60);

    const validationSuccess = Object.values(results.validation).filter(
        Boolean
    ).length;
    const directSuccess = Object.values(results.direct).filter(Boolean).length;
    const environmentSuccess = Object.values(results.environment).filter(
        Boolean
    ).length;
    const tablesSuccess = Object.values(results.tables).filter(Boolean).length;

    console.log(
        `認証情報検証: ${validationSuccess}/${environments.length}環境`
    );
    console.log(`直接接続: ${directSuccess}/${environments.length}環境`);
    console.log(
        `環境変数処理: ${environmentSuccess}/${environments.length}環境`
    );
    console.log(`テーブル作成: ${tablesSuccess}/${environments.length}環境`);

    if (tablesSuccess === environments.length) {
        console.log("\n🎉 全環境でTurso接続・テーブル作成が成功しました！");
        console.log("   → provisioning.tsの修正指針が明確になりました");
    } else {
        console.log("\n⚠️ 一部環境で問題があります。詳細な修正が必要です。");
    }

    // 問題がある場合の診断
    const failedEnvironments = environments.filter(
        (env) => !results.tables[env]
    );
    if (failedEnvironments.length > 0) {
        console.log("\n🔍 失敗環境の詳細診断:");
        for (const env of failedEnvironments) {
            console.log(
                `   ${env}: 認証=${results.validation[env]}, 直接=${results.direct[env]}, 環境変数=${results.environment[env]}, テーブル=${results.tables[env]}`
            );
        }
    }
}

// スクリプト実行
main().catch((error) => {
    console.error("🚨 テストスクリプト実行エラー:", error);
    process.exit(1);
});

// EOF
