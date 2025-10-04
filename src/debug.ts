/**
 * Development mode debug utilities
 */
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 開発モードの環境情報を表示
 */
export function printDevelopmentInfo(): void {
    console.log(chalk.gray('🔧 Development mode enabled'));
    console.log(chalk.gray('📍 Current working directory:'), chalk.gray(process.cwd()));
    console.log(chalk.gray('🔗 Node version:'), chalk.gray(process.version));
    console.log(chalk.gray('📦 CLI arguments:'), chalk.gray(JSON.stringify(process.argv, null, 2)));
}

/**
 * 開発用の一時ディレクトリをセットアップ
 */
export function setupDevelopmentWorkspace(): void {
    const tempDir = path.join(process.cwd(), 'temp', 'dev');

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // カレントディレクトリをtemp/devに変更
    process.chdir(tempDir);
    console.log(chalk.gray('📂 Changed working directory to:'), chalk.gray(process.cwd()));
}

/**
 * デバッグ情報を表示
 */
export function debugLog(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
        console.log(
            chalk.gray(`🐛 Debug: ${message}`),
            data ? chalk.gray(JSON.stringify(data, null, 2)) : ''
        );
    }
}

/**
 * 開発モードかどうかを判定
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}
