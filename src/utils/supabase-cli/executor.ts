/**
 * Supabase CLI コマンド実行ユーティリティ
 *
 * child_process を使用してSupabase CLIコマンドを実行し、
 * 結果を構造化されたデータとして返します。
 */

import { spawn } from "node:child_process";
import type {
    CommandResult,
    ExecOptions,
    SupabaseCommandError,
} from "./types.js";

/**
 * Supabase CLI コマンドを実行します
 *
 * @param args - 実行するコマンドの引数配列
 * @param options - 実行オプション
 * @returns Promise<CommandResult> - コマンド実行結果
 */
export function executeSupabaseCommand(
    args: string[],
    options: ExecOptions = {}
): Promise<CommandResult> {
    const { timeout = 30_000, env = {}, cwd = process.cwd() } = options;

    return new Promise((resolve) => {
        // 標準出力と標準エラー出力を蓄積するバッファ
        let stdout = "";
        let stderr = "";

        // 環境変数をマージ（既存の環境変数を保持）
        const mergedEnv = { ...process.env, ...env };

        // child_process.spawn を使用してコマンドを実行
        const child = spawn("supabase", args, {
            cwd,
            env: mergedEnv,
            stdio: ["ignore", "pipe", "pipe"], // stdin は無視、stdout と stderr をパイプ
        });

        // タイムアウト処理
        const timeoutId = setTimeout(() => {
            child.kill("SIGTERM"); // プロセスを強制終了
            resolve({
                stdout,
                stderr,
                exitCode: -1,
                error: new Error(
                    `Command timed out after ${timeout}ms: supabase ${args.join(" ")}`
                ),
            });
        }, timeout);

        // 標準出力データの処理
        child.stdout?.on("data", (data: Buffer) => {
            stdout += data.toString();
        });

        // 標準エラー出力データの処理
        child.stderr?.on("data", (data: Buffer) => {
            stderr += data.toString();
        });

        // プロセス終了時の処理
        child.on("close", (exitCode: number | null) => {
            clearTimeout(timeoutId); // タイムアウトタイマーをクリア
            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: exitCode ?? -1,
            });
        });

        // プロセスエラー時の処理
        child.on("error", (error: Error) => {
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr,
                exitCode: -1,
                error,
            });
        });
    });
}

/**
 * コマンド結果のJSONレスポンスをパースします
 *
 * @param result - コマンド実行結果
 * @returns パースされたJSONオブジェクト
 * @throws JSON パースに失敗した場合はエラーをスロー
 */
export function parseJsonResponse<T = unknown>(result: CommandResult): T {
    if (!result.stdout) {
        throw new Error("No output to parse");
    }

    try {
        return JSON.parse(result.stdout) as T;
    } catch (error) {
        throw new Error(
            `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * コマンドエラーをチェックし、エラーがある場合は例外をスローします
 *
 * @param result - コマンド実行結果
 * @param command - 実行されたコマンド（エラーメッセージ用）
 * @throws コマンドが失敗した場合はSupabaseCommandErrorをスロー
 */
export function throwOnError(result: CommandResult, command: string): void {
    if (result.exitCode !== 0 || result.error) {
        const error = new Error(
            `Supabase command failed: ${command}`
        ) as unknown as SupabaseCommandError;
        error.command = command;
        error.exitCode = result.exitCode;
        error.stderr = result.stderr;

        // 元のエラーがある場合は、そのメッセージも含める
        if (result.error) {
            error.message += ` - ${result.error.message}`;
        }

        // stderr がある場合も含める
        if (result.stderr) {
            error.message += ` - ${result.stderr}`;
        }

        throw error;
    }
}

// EOF
