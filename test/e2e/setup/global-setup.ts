/**
 * E2Eテストグローバルセットアップ
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkCLIAvailable } from "../helpers/cli-runner.js";
import { TEST_CONFIG } from "./test-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * グローバルセットアップ
 */
export async function setup(): Promise<void> {
    console.log("🚀 E2Eテスト環境をセットアップ中...");

    try {
        // 1. 出力ディレクトリの作成
        await createOutputDirectories();

        // 2. プロジェクトのビルド確認
        await verifyProjectBuild();

        // 3. CLI の利用可能性確認
        await verifyCLIAvailability();

        // 4. テスト環境の検証
        await verifyTestEnvironment();

        console.log("✅ E2Eテスト環境のセットアップが完了しました");
    } catch (error) {
        console.error("❌ E2Eテスト環境のセットアップに失敗しました:", error);
        throw error;
    }
}

/**
 * 出力ディレクトリの作成
 */
async function createOutputDirectories(): Promise<void> {
    const directories = ["test/e2e/reports", "test/e2e/outputs", "test/e2e/screenshots", "test/e2e/logs"];

    for (const dir of directories) {
        const dirPath = path.resolve(__dirname, "../../../", dir);
        await fs.mkdir(dirPath, { recursive: true });
    }

    console.log("📁 出力ディレクトリを作成しました");
}

/**
 * プロジェクトのビルド確認
 */
async function verifyProjectBuild(): Promise<void> {
    const cliPath = path.resolve(__dirname, "../../../dist/cli.js");

    try {
        await fs.access(cliPath);
        console.log("🔧 プロジェクトビルドを確認しました");
    } catch {
        throw new Error("プロジェクトがビルドされていません。'pnpm build' を実行してください。");
    }
}

/**
 * CLI の利用可能性確認
 */
async function verifyCLIAvailability(): Promise<void> {
    const isAvailable = await checkCLIAvailable();

    if (!isAvailable) {
        throw new Error("fluorite CLI が利用できません。プロジェクトをビルドしてください。");
    }

    console.log("⚡ CLI の利用可能性を確認しました");
}

/**
 * テスト環境の検証
 */
async function verifyTestEnvironment(): Promise<void> {
    // Node.js バージョン確認
    const nodeVersion = process.version;
    const majorVersion = Number.parseInt(nodeVersion.slice(1).split(".")[0], 10);

    if (majorVersion < 18) {
        throw new Error(`Node.js 18.0.0 以上が必要です。現在のバージョン: ${nodeVersion}`);
    }

    // 環境変数の確認
    const requiredEnvVars = ["NODE_ENV"];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.warn(`⚠️  環境変数 ${envVar} が設定されていません`);
        }
    }

    // プラットフォーム固有の設定
    if (process.platform === "win32") {
        console.log("🪟 Windows環境での実行を検出しました");
        // Windows固有の設定があればここに追加
    } else if (process.platform === "darwin") {
        console.log("🍎 macOS環境での実行を検出しました");
    } else {
        console.log("🐧 Linux環境での実行を検出しました");
    }

    // CI環境の検出
    if (process.env.CI) {
        console.log("🔄 CI環境での実行を検出しました");

        // CI固有の設定
        if (TEST_CONFIG.CI.REDUCE_PARALLELISM) {
            console.log("📉 CI環境のため並行数を削減します");
        }

        if (TEST_CONFIG.CI.SKIP_SLOW_TESTS) {
            console.log("⏩ CI環境のため低速テストをスキップします");
        }
    }

    console.log("🌍 テスト環境を検証しました");
}

/**
 * テスト開始時の情報表示
 */
export function displayTestInfo(): void {
    console.log(`\n${"=".repeat(60)}`);
    console.log("🧪 Fluorite CLI E2E テスト");
    console.log("=".repeat(60));
    console.log(`📍 Node.js: ${process.version}`);
    console.log(`🖥️  Platform: ${process.platform}`);
    console.log(`📦 Working Directory: ${process.cwd()}`);
    console.log(`🌐 Locale: ${process.env.FLUORITE_LOCALE || "auto"}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || "unknown"}`);
    console.log(`📊 CI: ${process.env.CI ? "yes" : "no"}`);
    console.log(`${"=".repeat(60)}\n`);
}

// 型エクスポート（他のファイルで使用する場合）
export type SetupResult = {
    success: boolean;
    error?: Error;
};

// このファイルが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
    setup()
        .then(() => {
            displayTestInfo();
            console.log("✅ セットアップが完了しました");
        })
        .catch((error) => {
            console.error("❌ セットアップに失敗しました:", error);
            process.exit(1);
        });
}

// EOF
