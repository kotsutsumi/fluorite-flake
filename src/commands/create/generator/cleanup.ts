/**
 * 生成失敗時のクリーンアップ処理を提供するモジュール
 */
import fs from "node:fs"; // ファイル削除に利用する
import chalk from "chalk"; // ユーザー向け警告の彩色に使用する

import { debugLog } from "../../../debug.js"; // デバッグログユーティリティ
import type { ProjectConfig } from "../types.js"; // プロジェクト設定型

/**
 * プロジェクト生成に失敗した際のディレクトリクリーンアップを実行する
 */
export async function cleanupFailedProject(config: ProjectConfig): Promise<void> {
    try {
        if (fs.existsSync(config.directory)) {
            debugLog("Cleaning up failed project directory", { directory: config.directory }); // クリーンアップ開始を記録
            fs.rmSync(config.directory, { recursive: true, force: true }); // ディレクトリを再帰的に削除する
            debugLog("Cleanup completed successfully"); // 完了を記録する
        }
    } catch (cleanupError) {
        debugLog("Failed to cleanup project directory", { cleanupError, directory: config.directory }); // エラー情報を記録
        console.warn(chalk.yellow(`⚠️ プロジェクトディレクトリのクリーンアップに失敗: ${config.directory}`)); // ユーザーへ警告する
        console.warn(chalk.yellow("手動でディレクトリを削除してください")); // 手動対応を促す
    }
}

// EOF
