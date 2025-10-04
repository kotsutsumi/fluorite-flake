import fs from "node:fs";
/**
 * Development mode debug utilities
 */
import path from "node:path";

// import { getMessages } from "./i18n.js"; // 実装時に使用

/**
 * 開発モードの環境情報を表示
 */
export function printDevelopmentInfo(): void {
    // 開発モードでの詳細情報表示（実装予定）
    // const { debug } = getMessages();
}

/**
 * 開発用の一時ディレクトリをセットアップ
 */
export function setupDevelopmentWorkspace(): void {
    // デバッグメッセージ（実装予定）
    // const { debug } = getMessages();
    const tempDir = path.join(process.cwd(), "temp", "dev");

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // カレントディレクトリをtemp/devに変更
    process.chdir(tempDir);
}

/**
 * デバッグ情報を表示
 */
export function debugLog(_message: string, _data?: unknown): void {
    if (process.env.NODE_ENV === "development") {
        // デバッグメッセージ表示（実装予定）
        // const { debug } = getMessages();
    }
}

// EOF

/**
 * 開発モードかどうかを判定
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === "development";
}

// EOF
