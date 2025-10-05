/**
 * GitHub CLI コマンド実行エンジン
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";

import type {
    ExecutionOptions,
    GitHubCLICommand,
    GitHubCLIResponse,
} from "../types/common.js";
import { GitHubCLIErrorCode } from "../types/common.js";
import { GitHubCLIError, handleError, isRecoverable } from "./error-handler.js";

const execAsync = promisify(exec);

// コマンド実行エンジンクラス
export class GitHubCLIExecutor {
    private readonly defaultTimeout = 30_000; // 30秒
    private readonly defaultRetryCount = 3;
    private readonly defaultRetryDelay = 1000; // 1秒

    // メインのコマンド実行メソッド
    async execute<T = any>(
        command: GitHubCLICommand,
        options: ExecutionOptions = {}
    ): Promise<GitHubCLIResponse<T>> {
        const startTime = Date.now();
        const commandString = this.buildCommandString(command);

        try {
            // コマンドの妥当性チェック
            this.validateCommand(command);

            // 実行オプションのマージ
            const execOptions = this.mergeOptions(options);

            // リトライ機能付きでコマンド実行
            const result = await this.executeWithRetry(
                commandString,
                execOptions
            );

            // レスポンスの解析
            const data = this.parseResponse<T>(result.stdout, command);

            return {
                success: true,
                data,
                raw: result.stdout,
                exitCode: 0,
                executionTime: Math.max(1, Date.now() - startTime),
            };
        } catch (error) {
            const githubError = handleError(error, commandString);

            return {
                success: false,
                error: githubError,
                raw: error instanceof Error ? error.message : String(error),
                exitCode: 1,
                executionTime: Math.max(1, Date.now() - startTime),
            };
        }
    }

    // 生のコマンド文字列を実行
    async executeRaw(
        commandString: string,
        options: ExecutionOptions = {}
    ): Promise<GitHubCLIResponse<string>> {
        const startTime = Date.now();

        try {
            const execOptions = this.mergeOptions(options);
            const result = await this.executeWithRetry(
                commandString,
                execOptions
            );

            return {
                success: true,
                data: result.stdout.trim(),
                raw: result.stdout,
                exitCode: 0,
                executionTime: Math.max(1, Date.now() - startTime),
            };
        } catch (error) {
            const githubError = handleError(error, commandString);

            return {
                success: false,
                error: githubError,
                raw: error instanceof Error ? error.message : String(error),
                exitCode: 1,
                executionTime: Math.max(1, Date.now() - startTime),
            };
        }
    }

    // コマンド文字列の構築
    private buildCommandString(command: GitHubCLICommand): string {
        const parts = ["gh", command.command];

        // 引数の追加
        if (command.args) {
            parts.push(...command.args);
        }

        // フラグの追加
        if (command.flags) {
            for (const [key, value] of Object.entries(command.flags)) {
                if (typeof value === "boolean") {
                    if (value) {
                        parts.push(`--${key}`);
                    }
                } else {
                    parts.push(`--${key}`, String(value));
                }
            }
        }

        return parts.join(" ");
    }

    // コマンドの妥当性チェック
    private validateCommand(command: GitHubCLICommand): void {
        if (!command.command || typeof command.command !== "string") {
            throw new GitHubCLIError(
                GitHubCLIErrorCode.VALIDATION_ERROR,
                "コマンドが指定されていません",
                { suggestion: "有効なコマンド名を指定してください" }
            );
        }

        // 危険なコマンドのチェック
        const dangerousCommands = ["rm", "delete", "destroy"];
        if (dangerousCommands.some((cmd) => command.command.includes(cmd))) {
            throw new GitHubCLIError(
                GitHubCLIErrorCode.VALIDATION_ERROR,
                "危険なコマンドは実行できません",
                { command: command.command }
            );
        }
    }

    // 実行オプションのマージ
    private mergeOptions(
        options: ExecutionOptions
    ): Required<ExecutionOptions> {
        return {
            timeout: options.timeout || this.defaultTimeout,
            retryCount: options.retryCount || this.defaultRetryCount,
            retryDelay: options.retryDelay || this.defaultRetryDelay,
            suppressErrors: options.suppressErrors ?? false,
            cwd: options.cwd || process.cwd(),
            env: { ...process.env, ...(options.env || {}) } as Record<
                string,
                string
            >,
        };
    }

    // リトライ機能付きコマンド実行
    private async executeWithRetry(
        command: string,
        options: Required<ExecutionOptions>
    ): Promise<{ stdout: string; stderr: string }> {
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= options.retryCount; attempt++) {
            try {
                const result = await execAsync(command, {
                    timeout: options.timeout,
                    cwd: options.cwd,
                    env: options.env,
                });

                return result;
            } catch (error) {
                lastError =
                    error instanceof Error ? error : new Error(String(error));

                // 最後の試行でない場合はリトライ
                if (attempt < options.retryCount) {
                    // 復旧可能なエラーまたは一般的なエラーの場合はリトライ
                    const githubError = handleError(lastError, command);
                    if (
                        isRecoverable(githubError) ||
                        this.shouldRetryGenericError(lastError)
                    ) {
                        await this.delay(options.retryDelay * attempt); // 指数バックオフ
                        continue;
                    }
                }

                throw lastError;
            }
        }

        throw (
            lastError ||
            new Error("Unknown error occurred during command execution")
        );
    }

    // レスポンスの解析
    private parseResponse<T>(
        output: string,
        _command: GitHubCLICommand
    ): T | undefined {
        const trimmedOutput = output.trim();

        if (!trimmedOutput) {
            return;
        }

        // JSON形式のレスポンスを試行
        try {
            return JSON.parse(trimmedOutput) as T;
        } catch {
            // JSON解析に失敗した場合は文字列として返す
            return trimmedOutput as unknown as T;
        }
    }

    // 遅延処理
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // 一般的なエラーに対するリトライ判定
    private shouldRetryGenericError(error: Error): boolean {
        // 認証エラーや明確に復旧不可能なエラー以外はリトライする
        const nonRetryablePatterns = [
            /authentication/i,
            /authorization/i,
            /forbidden/i,
            /not found/i,
            /validation/i,
        ];

        return !nonRetryablePatterns.some((pattern) =>
            pattern.test(error.message)
        );
    }

    // GitHub CLI のインストール確認
    async checkInstallation(): Promise<boolean> {
        try {
            const result = await this.executeRaw("gh --version");
            return result.success;
        } catch {
            return false;
        }
    }

    // GitHub CLI のバージョン取得
    async getVersion(): Promise<string | null> {
        try {
            const result = await this.executeRaw("gh --version");
            if (result.success && result.data) {
                // より柔軟なバージョンマッチング
                const versionPatterns = [
                    /gh version (\d+\.\d+\.\d+)/, // "gh version 2.20.2"
                    /version (\d+\.\d+\.\d+)/, // "version 2.20.2"
                    /(\d+\.\d+\.\d+)/, // "2.20.2"
                ];

                for (const pattern of versionPatterns) {
                    const match = result.data.match(pattern);
                    if (match) {
                        return match[1];
                    }
                }
            }
            return null;
        } catch {
            return null;
        }
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const githubCLI = new GitHubCLIExecutor();

// EOF
