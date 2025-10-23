/**
 * Development mode debug utilities
 */
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";

import { getMessages } from "./i18n.js";

/**
 * 開発モードの環境情報を表示
 */
export function printDevelopmentInfo(): void {
    if (!isDevelopment()) {
        return;
    }

    const { debug } = getMessages();

    // 開発モード有効メッセージ
    console.log(chalk.gray(debug.devModeEnabled));

    // 現在のディレクトリ情報
    console.log(chalk.gray(debug.cwdLabel), chalk.gray(process.cwd()));

    // Node.jsバージョン情報
    console.log(chalk.gray(debug.nodeVersionLabel), chalk.gray(process.version));

    // コマンドライン引数情報
    const args = process.argv.slice(2);
    console.log(chalk.gray(debug.argsLabel), chalk.gray(JSON.stringify(args)));
}

/**
 * 開発用の一時ディレクトリをセットアップ
 */
export function setupDevelopmentWorkspace(): void {
    if (!isDevelopment()) {
        return;
    }

    const { debug } = getMessages();
    const tempDir = path.join(process.cwd(), "temp", "dev");

    // ディレクトリが存在しない場合のみ作成（既存のプロジェクトを保持）
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // カレントディレクトリをtemp/devに変更
    process.chdir(tempDir);

    // ディレクトリ変更をログ出力
    console.log(chalk.gray(debug.changedDirectory), chalk.gray(process.cwd()));
}

/**
 * デバッグ情報を表示
 */
export function debugLog(message: string, data?: unknown): void {
    if (!isDevelopment()) {
        return;
    }

    const { debug } = getMessages();

    // デバッグメッセージを表示
    console.log(chalk.gray(debug.debugMessage(message)), data ? chalk.gray(JSON.stringify(data, null, 2)) : "");
}

/**
 * 開発モードかどうかを判定
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
}

// EOF
