/**
 * E2Eテストグローバルクリーンアップ
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanupAllTempDirectories } from "../helpers/temp-manager.js";
import { TEST_CONFIG } from "./test-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * グローバルクリーンアップ
 */
export async function teardown(): Promise<void> {
    console.log("🧹 E2Eテスト環境をクリーンアップ中...");

    try {
        // 1. 一時ディレクトリのクリーンアップ
        await cleanupTempDirectories();

        // 2. テスト成果物の整理
        await organizeTestArtifacts();

        // 3. ログの出力
        await outputTestSummary();

        console.log("✅ E2Eテスト環境のクリーンアップが完了しました");
    } catch (error) {
        console.error("⚠️  クリーンアップ中にエラーが発生しました:", error);
        // クリーンアップのエラーはテスト失敗にしない
    }
}

/**
 * 一時ディレクトリのクリーンアップ
 */
async function cleanupTempDirectories(): Promise<void> {
    try {
        await cleanupAllTempDirectories();
        console.log("🗑️  一時ディレクトリをクリーンアップしました");
    } catch (error) {
        console.warn("⚠️  一時ディレクトリのクリーンアップに失敗:", error);
    }
}

/**
 * テスト成果物の整理
 */
async function organizeTestArtifacts(): Promise<void> {
    if (!TEST_CONFIG.LOGGING.SAVE_OUTPUTS) {
        return;
    }

    try {
        const outputDir = path.resolve(
            __dirname,
            "../../../",
            TEST_CONFIG.LOGGING.OUTPUT_DIR
        );
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

        // タイムスタンプ付きディレクトリの作成
        const timestampedDir = path.join(outputDir, `run-${timestamp}`);
        await fs.mkdir(timestampedDir, { recursive: true });

        // レポートファイルの移動
        const reportDir = path.resolve(__dirname, "../reports");
        try {
            const reportFiles = await fs.readdir(reportDir);
            for (const file of reportFiles) {
                const srcPath = path.join(reportDir, file);
                const destPath = path.join(timestampedDir, file);
                await fs.copyFile(srcPath, destPath);
            }
            console.log("📋 テストレポートを保存しました");
        } catch {
            // レポートディレクトリが存在しない場合は無視
        }

        // ログファイルの移動
        const logDir = path.resolve(__dirname, "../logs");
        try {
            const logFiles = await fs.readdir(logDir);
            for (const file of logFiles) {
                const srcPath = path.join(logDir, file);
                const destPath = path.join(timestampedDir, file);
                await fs.copyFile(srcPath, destPath);
            }
            console.log("📝 テストログを保存しました");
        } catch {
            // ログディレクトリが存在しない場合は無視
        }

        console.log(`📦 テスト成果物を保存しました: ${timestampedDir}`);
    } catch (error) {
        console.warn("⚠️  テスト成果物の整理に失敗:", error);
    }
}

/**
 * テスト実行サマリーの出力
 */
async function outputTestSummary(): Promise<void> {
    const summaryData = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            ci: !!process.env.CI,
            locale: process.env.FLUORITE_LOCALE || "auto",
        },
        configuration: {
            skipSlowTests: TEST_CONFIG.CI.SKIP_SLOW_TESTS,
            reduceParallelism: TEST_CONFIG.CI.REDUCE_PARALLELISM,
            enableMocks: TEST_CONFIG.MOCKS.ENABLE_API_MOCKS,
            verboseLogging: TEST_CONFIG.LOGGING.VERBOSE,
        },
    };

    const summaryPath = path.resolve(__dirname, "../outputs/test-summary.json");
    await fs.mkdir(path.dirname(summaryPath), { recursive: true });
    await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2));

    console.log("📊 テスト実行サマリーを出力しました");
}

/**
 * 緊急クリーンアップ（プロセス終了時）
 */
export async function emergencyCleanup(): Promise<void> {
    console.log("🚨 緊急クリーンアップを実行中...");

    try {
        // 最低限のクリーンアップ
        await cleanupAllTempDirectories();
        console.log("✅ 緊急クリーンアップが完了しました");
    } catch (error) {
        console.error("❌ 緊急クリーンアップに失敗:", error);
    }
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
function formatFileSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * ディレクトリサイズの計算
 */
async function calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);

            if (entry.isFile()) {
                const stat = await fs.stat(entryPath);
                totalSize += stat.size;
            } else if (entry.isDirectory()) {
                totalSize += await calculateDirectorySize(entryPath);
            }
        }
    } catch {
        // アクセスできないディレクトリは無視
    }

    return totalSize;
}

/**
 * クリーンアップ統計の表示
 */
async function displayCleanupStats(): Promise<void> {
    try {
        const outputDir = path.resolve(__dirname, "../outputs");
        const reportsDir = path.resolve(__dirname, "../reports");
        const logsDir = path.resolve(__dirname, "../logs");

        const [outputSize, reportsSize, logsSize] = await Promise.all([
            calculateDirectorySize(outputDir).catch(() => 0),
            calculateDirectorySize(reportsDir).catch(() => 0),
            calculateDirectorySize(logsDir).catch(() => 0),
        ]);

        console.log("\n📈 クリーンアップ統計:");
        console.log(`   出力ファイル: ${formatFileSize(outputSize)}`);
        console.log(`   レポート: ${formatFileSize(reportsSize)}`);
        console.log(`   ログ: ${formatFileSize(logsSize)}`);
        console.log(
            `   合計: ${formatFileSize(outputSize + reportsSize + logsSize)}`
        );
    } catch (error) {
        console.warn("⚠️  統計の計算に失敗:", error);
    }
}

// プロセス終了時の自動クリーンアップ設定
process.on("exit", () => {
    // 同期的なクリーンアップ（ベストエフォート）
    try {
        // 重要: 同期関数のみ使用可能
        console.log("🔄 プロセス終了時クリーンアップ...");
    } catch {
        // 無視
    }
});

process.on("SIGINT", async () => {
    console.log("\n🛑 割り込みシグナルを受信しました");
    await emergencyCleanup();
    process.exit(130);
});

process.on("SIGTERM", async () => {
    console.log("\n🛑 終了シグナルを受信しました");
    await emergencyCleanup();
    process.exit(143);
});

// このファイルが直接実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
    teardown()
        .then(async () => {
            await displayCleanupStats();
            console.log("✅ クリーンアップが完了しました");
        })
        .catch((error) => {
            console.error("❌ クリーンアップに失敗しました:", error);
            process.exit(1);
        });
}

// EOF
