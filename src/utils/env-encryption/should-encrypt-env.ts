/**
 * 暗号化実行可否判定
 * - TTY環境の確認
 * - スクリプトファイルの存在確認
 * - zipコマンドの利用可能性チェック
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";

export type EncryptionEnvironmentCheck = {
    canExecute: boolean;
    isTTY: boolean;
    hasScript: boolean;
    hasZip: boolean;
    scriptPath?: string;
    reason?: string;
};

/**
 * 暗号化実行環境をチェック
 */
export async function shouldEncryptEnv(
    appDirectory: string
): Promise<EncryptionEnvironmentCheck> {
    const result: EncryptionEnvironmentCheck = {
        canExecute: false,
        isTTY: process.stdin.isTTY === true,
        hasScript: false,
        hasZip: false,
    };

    // スクリプト存在確認
    const scriptPath = join(appDirectory, "scripts", "env-tools.ts");
    result.hasScript = existsSync(scriptPath);
    result.scriptPath = scriptPath;

    // zipコマンド確認
    try {
        await execa("zip", ["--version"], {
            stdio: "pipe",
            timeout: 5000,
        });
        result.hasZip = true;
    } catch (error) {
        result.hasZip = false;
    }

    // 実行可否判定
    if (!result.isTTY) {
        result.reason = "非対話環境では暗号化を実行できません";
    } else if (!result.hasScript) {
        result.reason = "env-tools.tsスクリプトが見つかりません";
    } else if (result.hasZip) {
        result.canExecute = true;
    } else {
        result.reason = "zipコマンドが利用できません";
    }

    return result;
}

// EOF
