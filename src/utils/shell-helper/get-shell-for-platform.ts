/**
 * プラットフォームに応じた適切なシェルパスを取得する
 * Windows環境ではcmdを、Unix系環境では利用可能なシェルを探索して返す
 *
 * @returns プラットフォーム固有のシェルパス
 * @example
 * ```typescript
 * // Windows: "cmd.exe"
 * // macOS/Linux: "/bin/sh" など
 * const shell = getShellForPlatform();
 * ```
 */
import { accessSync, constants as fsConstants } from "node:fs";
import { isAbsolute } from "node:path";

/**
 * シェルパスが実行可能かどうかを判定
 */
function isExecutableShell(shellPath: string | undefined): boolean {
    if (!(shellPath && isAbsolute(shellPath))) {
        return false;
    }

    try {
        accessSync(shellPath, fsConstants.X_OK);
        return true;
    } catch {
        return false;
    }
}

export function getShellForPlatform(): string {
    // Windows環境の場合はCOMSPECを優先し、無い場合はcmd.exeを返す
    if (process.platform === "win32") {
        return process.env.ComSpec ?? "cmd.exe";
    }

    // Unix系環境では利用可能なシェルを順番に探索
    const candidates = Array.from(
        new Set(
            [
                process.env.SHELL,
                "/bin/sh",
                "/usr/bin/sh",
                "/bin/bash",
                "/usr/bin/bash",
                "/bin/zsh",
                "/usr/bin/zsh",
            ].filter((value): value is string => Boolean(value))
        )
    );

    for (const candidate of candidates) {
        if (isExecutableShell(candidate)) {
            return candidate;
        }
    }

    // すべての候補が利用不可の場合は最後にPATH解決へ委ねる
    return "sh";
}

// EOF
