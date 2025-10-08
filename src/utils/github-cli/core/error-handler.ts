/**
 * GitHub CLI エラーハンドリングシステム
 */
import { GitHubCLIErrorCode, type GitHubCLIError as GitHubCLIErrorType } from "../types/common.js";

// カスタムエラークラス
export class GitHubCLIError extends Error {
    readonly code: GitHubCLIErrorCode;
    readonly originalError?: Error;
    readonly command?: string;
    readonly suggestion?: string;

    constructor(
        code: GitHubCLIErrorCode,
        message: string,
        options?: {
            originalError?: Error;
            command?: string;
            suggestion?: string;
        }
    ) {
        super(message);
        this.name = "GitHubCLIError";
        this.code = code;
        this.originalError = options?.originalError;
        this.command = options?.command;
        this.suggestion = options?.suggestion;

        // スタックトレースの設定
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, GitHubCLIError);
        }
    }

    // エラー情報をJSON形式で取得
    toJSON(): GitHubCLIErrorType {
        return {
            code: this.code,
            message: this.message,
            originalError: this.originalError,
            command: this.command,
            suggestion: this.suggestion,
        };
    }

    // ユーザーフレンドリーなエラーメッセージを生成
    getUserFriendlyMessage(): string {
        const baseMessage = this.getLocalizedMessage();
        return this.suggestion ? `${baseMessage}\n\n💡 ${this.suggestion}` : baseMessage;
    }

    // ローカライズされたエラーメッセージを取得
    private getLocalizedMessage(): string {
        const errorMessages: Record<GitHubCLIErrorCode, string> = {
            [GitHubCLIErrorCode.AUTH_FAILED]: "GitHub CLI の認証に失敗しました",
            [GitHubCLIErrorCode.AUTH_EXPIRED]: "GitHub CLI の認証トークンが期限切れです",
            [GitHubCLIErrorCode.AUTH_MISSING]: "GitHub CLI の認証が設定されていません",
            [GitHubCLIErrorCode.COMMAND_NOT_FOUND]: "GitHub CLI コマンドが見つかりません",
            [GitHubCLIErrorCode.INVALID_COMMAND]: "無効なコマンドです",
            [GitHubCLIErrorCode.EXECUTION_FAILED]: "コマンドの実行に失敗しました",
            [GitHubCLIErrorCode.TIMEOUT]: "コマンドの実行がタイムアウトしました",
            [GitHubCLIErrorCode.API_RATE_LIMIT]: "GitHub API のレート制限に達しました",
            [GitHubCLIErrorCode.API_UNAVAILABLE]: "GitHub API が利用できません",
            [GitHubCLIErrorCode.NETWORK_ERROR]: "ネットワークエラーが発生しました",
            [GitHubCLIErrorCode.PARSE_ERROR]: "レスポンスの解析に失敗しました",
            [GitHubCLIErrorCode.VALIDATION_ERROR]: "入力値の検証に失敗しました",
            [GitHubCLIErrorCode.UNKNOWN_ERROR]: "不明なエラーが発生しました",
        };

        return errorMessages[this.code] || this.message;
    }
}

// エラーの分類と変換
function classifyError(error: Error, command?: string): GitHubCLIError {
    const message = error.message.toLowerCase();

    // 認証エラーの判定
    if (message.includes("not logged in") || message.includes("authentication")) {
        return new GitHubCLIError(GitHubCLIErrorCode.AUTH_MISSING, error.message, {
            originalError: error,
            command,
            suggestion: "gh auth login を実行して認証を行ってください",
        });
    }

    // コマンド未発見エラー
    if (message.includes("command not found") || message.includes("gh: not found")) {
        return new GitHubCLIError(GitHubCLIErrorCode.COMMAND_NOT_FOUND, error.message, {
            originalError: error,
            command,
            suggestion: "GitHub CLI がインストールされているか確認してください",
        });
    }

    // ネットワークエラー
    if (message.includes("network") || message.includes("connection") || message.includes("timeout")) {
        return new GitHubCLIError(GitHubCLIErrorCode.NETWORK_ERROR, error.message, {
            originalError: error,
            command,
            suggestion: "ネットワーク接続を確認してください",
        });
    }

    // レート制限エラー
    if (message.includes("rate limit") || message.includes("api rate limit")) {
        return new GitHubCLIError(GitHubCLIErrorCode.API_RATE_LIMIT, error.message, {
            originalError: error,
            command,
            suggestion: "しばらく時間をおいてから再試行してください",
        });
    }

    // その他の実行エラー
    return new GitHubCLIError(GitHubCLIErrorCode.EXECUTION_FAILED, error.message, { originalError: error, command });
}

// 汎用エラーハンドリング
export function handleError(error: unknown, command?: string): GitHubCLIError {
    // 既にGitHubCLIErrorの場合はそのまま返す
    if (error instanceof GitHubCLIError) {
        return error;
    }

    // 標準Errorオブジェクトの場合
    if (error instanceof Error) {
        return classifyError(error, command);
    }

    // その他の場合
    return new GitHubCLIError(
        GitHubCLIErrorCode.UNKNOWN_ERROR,
        typeof error === "string" ? error : "Unknown error occurred",
        { command }
    );
}

// 復旧可能なエラーかどうかを判定
export function isRecoverable(error: GitHubCLIError): boolean {
    const recoverableErrors: GitHubCLIErrorCode[] = [
        GitHubCLIErrorCode.TIMEOUT,
        GitHubCLIErrorCode.NETWORK_ERROR,
        GitHubCLIErrorCode.API_UNAVAILABLE,
    ];

    return recoverableErrors.includes(error.code);
}

// ユーザーアクションが必要なエラーかどうかを判定
export function requiresUserAction(error: GitHubCLIError): boolean {
    const userActionErrors: GitHubCLIErrorCode[] = [
        GitHubCLIErrorCode.AUTH_MISSING,
        GitHubCLIErrorCode.AUTH_EXPIRED,
        GitHubCLIErrorCode.COMMAND_NOT_FOUND,
        GitHubCLIErrorCode.VALIDATION_ERROR,
    ];

    return userActionErrors.includes(error.code);
}

// EOF
