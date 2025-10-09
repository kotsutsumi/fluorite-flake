/**
 * GitHub CLI エラーハンドリングシステムのテスト
 */
import { describe, expect, it } from "vitest";

import {
    GitHubCLIError,
    handleError,
    isRecoverable,
    requiresUserAction,
} from "../../../../../src/utils/github-cli/core/error-handler.ts";
import { GitHubCLIErrorCode } from "../../../../../src/utils/github-cli/types/common.ts";

describe("GitHubCLIError", () => {
    describe("基本機能", () => {
        it("エラーコードとメッセージを正しく設定する", () => {
            const error = new GitHubCLIError(GitHubCLIErrorCode.AUTH_FAILED, "テスト認証エラー");

            expect(error.code).toBe(GitHubCLIErrorCode.AUTH_FAILED);
            expect(error.message).toBe("テスト認証エラー");
            expect(error.name).toBe("GitHubCLIError");
        });

        it("オプション情報を正しく設定する", () => {
            const originalError = new Error("元のエラー");

            const error = new GitHubCLIError(GitHubCLIErrorCode.NETWORK_ERROR, "ネットワークエラー", {
                originalError,
                command: "gh repo list",
                suggestion: "ネットワーク接続を確認してください",
            });

            expect(error.originalError).toBe(originalError);
            expect(error.command).toBe("gh repo list");
            expect(error.suggestion).toBe("ネットワーク接続を確認してください");
        });
    });

    describe("toJSON", () => {
        it("エラー情報をJSON形式で正しく返す", () => {
            const error = new GitHubCLIError(GitHubCLIErrorCode.VALIDATION_ERROR, "バリデーションエラー", {
                command: "test command",
                suggestion: "テストの提案",
            });

            const json = error.toJSON();

            expect(json.code).toBe(GitHubCLIErrorCode.VALIDATION_ERROR);
            expect(json.message).toBe("バリデーションエラー");
            expect(json.command).toBe("test command");
            expect(json.suggestion).toBe("テストの提案");
        });
    });

    describe("getUserFriendlyMessage", () => {
        it("提案なしの場合、基本メッセージのみを返す", () => {
            const error = new GitHubCLIError(GitHubCLIErrorCode.TIMEOUT, "タイムアウトしました");

            const message = error.getUserFriendlyMessage();

            expect(message).toContain("タイムアウトしました");
            expect(message).not.toContain("💡");
        });

        it("提案ありの場合、提案を含むメッセージを返す", () => {
            const error = new GitHubCLIError(GitHubCLIErrorCode.AUTH_MISSING, "認証情報が見つかりません", {
                suggestion: "gh auth login を実行してください",
            });

            const message = error.getUserFriendlyMessage();

            expect(message).toContain("GitHub CLI の認証が設定されていません");
            expect(message).toContain("gh auth login");
        });
    });
});

describe("handleError", () => {
    it("既存のGitHubCLIErrorをそのまま返す", () => {
        const originalError = new GitHubCLIError(GitHubCLIErrorCode.AUTH_FAILED, "認証に失敗しました");

        const result = handleError(originalError);
        expect(result).toBe(originalError);
    });

    it("標準Errorを適切に分類する", () => {
        const authError = new Error("not logged in to github.com");

        const result = handleError(authError, "gh repo view");
        expect(result.code).toBe(GitHubCLIErrorCode.AUTH_MISSING);
        expect(result.command).toBe("gh repo view");
    });

    it("文字列エラーを適切に処理する", () => {
        const result = handleError("custom error message");
        expect(result.code).toBe(GitHubCLIErrorCode.UNKNOWN_ERROR);
        expect(result.message).toBe("custom error message");
    });
});

describe("エラー分類", () => {
    it("認証エラーを正しく分類する", () => {
        const error = handleError(new Error("Authentication failed"));
        expect(error.code).toBe(GitHubCLIErrorCode.AUTH_MISSING);
    });

    it("コマンド未発見エラーを正しく分類する", () => {
        const error = handleError(new Error("command not found: gh"));
        expect(error.code).toBe(GitHubCLIErrorCode.COMMAND_NOT_FOUND);
    });

    it("ネットワークエラーを正しく分類する", () => {
        const error = handleError(new Error("Network timeout"));
        expect(error.code).toBe(GitHubCLIErrorCode.NETWORK_ERROR);
    });

    it("レート制限エラーを正しく分類する", () => {
        const error = handleError(new Error("API rate limit exceeded"));
        expect(error.code).toBe(GitHubCLIErrorCode.API_RATE_LIMIT);
    });

    it("分類できないエラーを実行失敗として処理する", () => {
        const error = handleError(new Error("unknown"));
        expect(error.code).toBe(GitHubCLIErrorCode.EXECUTION_FAILED);
    });
});

describe("isRecoverable", () => {
    it("復旧可能なエラーに対してtrueを返す", () => {
        const recoverableErrors: GitHubCLIErrorCode[] = [
            GitHubCLIErrorCode.TIMEOUT,
            GitHubCLIErrorCode.NETWORK_ERROR,
            GitHubCLIErrorCode.API_UNAVAILABLE,
        ];

        for (const code of recoverableErrors) {
            const error = new GitHubCLIError(code, "test");
            expect(isRecoverable(error)).toBe(true);
        }
    });

    it("復旧不可能なエラーに対してfalseを返す", () => {
        const error = new GitHubCLIError(GitHubCLIErrorCode.AUTH_FAILED, "test");
        expect(isRecoverable(error)).toBe(false);
    });
});

describe("requiresUserAction", () => {
    it("ユーザーアクションが必要なエラーに対してtrueを返す", () => {
        const error = new GitHubCLIError(GitHubCLIErrorCode.AUTH_MISSING, "test");
        expect(requiresUserAction(error)).toBe(true);
    });

    it("ユーザーアクションが不要なエラーに対してfalseを返す", () => {
        const error = new GitHubCLIError(GitHubCLIErrorCode.TIMEOUT, "test");
        expect(requiresUserAction(error)).toBe(false);
    });
});

// EOF
