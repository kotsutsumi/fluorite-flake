/**
 * Turso CLI コマンド実行ユーティリティ
 */

import { spawn } from "node:child_process";
import type { CommandResult, ExecOptions } from "./types.js";

/**
 * Turso CLI コマンドを実行する基本関数
 */
export function executeTursoCommand(
    args: string[],
    options: ExecOptions = {}
): Promise<CommandResult> {
    const { timeout = 30_000, env = {}, cwd = process.cwd() } = options;

    return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";

        // turso コマンドを実行
        const child = spawn("turso", args, {
            cwd,
            env: { ...process.env, ...env },
            stdio: "pipe",
        });

        // タイムアウトハンドリング
        const timeoutId = setTimeout(() => {
            child.kill("SIGTERM");
            resolve({
                success: false,
                error: `Command timeout after ${timeout}ms`,
                stderr: "Timeout",
                stdout,
            });
        }, timeout);

        // 標準出力の収集
        child.stdout?.on("data", (data) => {
            stdout += data.toString();
        });

        // エラー出力の収集
        child.stderr?.on("data", (data) => {
            stderr += data.toString();
        });

        // プロセス終了時の処理
        child.on("close", (code) => {
            clearTimeout(timeoutId);

            const success = code === 0;
            const result: CommandResult = {
                success,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
            };

            if (!success) {
                result.error = `Command failed with exit code ${code}`;
            }

            resolve(result);
        });

        // エラーハンドリング
        child.on("error", (error) => {
            clearTimeout(timeoutId);
            resolve({
                success: false,
                error: `Failed to execute command: ${error.message}`,
                stderr: error.message,
                stdout,
            });
        });
    });
}

/**
 * JSONレスポンスをパースする
 */
export function parseJsonResponse<T>(result: CommandResult): CommandResult<T> {
    if (!(result.success && result.stdout)) {
        return result;
    }

    try {
        const data = JSON.parse(result.stdout) as T;
        return {
            ...result,
            data,
        };
    } catch (error) {
        return {
            ...result,
            success: false,
            error: `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
    }
}

/**
 * コマンド結果からエラーを投げる
 */
export function throwOnError(result: CommandResult, commandName: string): void {
    if (!result.success) {
        const error = new (class extends Error {
            name = "TursoCliError";
            command: string;
            exitCode?: number;
            stderr?: string;

            constructor(
                message: string,
                command: string,
                exitCode?: number,
                stderr?: string
            ) {
                super(message);
                this.command = command;
                this.exitCode = exitCode;
                this.stderr = stderr;
            }
        })(
            result.error || "Command failed",
            commandName,
            undefined,
            result.stderr
        );
        throw error;
    }
}

// EOF
