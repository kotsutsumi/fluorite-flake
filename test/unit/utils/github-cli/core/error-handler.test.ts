/**
 * GitHub CLI エラーハンドリングシステムのテスト
 */
import { describe, expect, it } from "vitest";

import { ErrorHandler, GitHubCLIError } from "../../../../../src/utils/github-cli/core/error-handler.ts";
import { GitHubCLIErrorCode } from "../../../../../src/utils/github-cli/types/common.ts";

describe("GitHubCLIError", () => {
    describe("基本機能", () => {
        it("エラーコードとメッセージを正しく設定する", () => {
            // GitHubCLIErrorインスタンスを作成
            const error = new GitHubCLIError(
                GitHubCLIErrorCode.AUTH_FAILED,
                "テスト認証エラー"
            );

            // プロパティを検証
            expect(error.code).toBe(GitHubCLIErrorCode.AUTH_FAILED);
            expect(error.message).toBe("テスト認証エラー");
            expect(error.name).toBe("GitHubCLIError");
        });

        it("オプション情報を正しく設定する", () => {
            // 元のエラーオブジェクトを作成
            const originalError = new Error("元のエラー");

            // オプション付きでGitHubCLIErrorを作成
            const error = new GitHubCLIError(
                GitHubCLIErrorCode.NETWORK_ERROR,
                "ネットワークエラー",
                {
                    originalError,
                    command: "gh repo list",
                    suggestion: "ネットワーク接続を確認してください",
                }
            );

            // オプションが正しく設定されているか検証
            expect(error.originalError).toBe(originalError);
            expect(error.command).toBe("gh repo list");
            expect(error.suggestion).toBe("ネットワーク接続を確認してください");
        });
    });

    describe("toJSON", () => {
        it("エラー情報をJSON形式で正しく返す", () => {
            // エラーオブジェクトを作成
            const error = new GitHubCLIError(
                GitHubCLIErrorCode.VALIDATION_ERROR,
                "バリデーションエラー",
                {
                    command: "test command",
                    suggestion: "テストの提案",
                }
            );

            // JSON形式に変換
            const json = error.toJSON();

            // JSONの内容を検証
            expect(json.code).toBe(GitHubCLIErrorCode.VALIDATION_ERROR);
            expect(json.message).toBe("バリデーションエラー");
            expect(json.command).toBe("test command");
            expect(json.suggestion).toBe("テストの提案");
        });
    });

    describe("getUserFriendlyMessage", () => {
        it("提案なしの場合、基本メッセージのみを返す", () => {
            // 提案なしのエラーを作成
            const error = new GitHubCLIError(
                GitHubCLIErrorCode.TIMEOUT,
                "タイムアウトしました"
            );

            // ユーザーフレンドリーメッセージを取得
            const message = error.getUserFriendlyMessage();

            // 結果を検証
            expect(message).toBe("コマンドの実行がタイムアウトしました");
        });

        it("提案ありの場合、提案を含むメッセージを返す", () => {
            // 提案ありのエラーを作成
            const error = new GitHubCLIError(
                GitHubCLIErrorCode.AUTH_MISSING,
                "認証が必要です",
                {
                    suggestion: "gh auth login を実行してください",
                }
            );

            // ユーザーフレンドリーメッセージを取得
            const message = error.getUserFriendlyMessage();

            // 結果を検証（提案が含まれているか）
            expect(message).toContain("GitHub CLI の認証が設定されていません");
            expect(message).toContain("💡 gh auth login を実行してください");
        });
    });

    describe("ローカライズされたメッセージ", () => {
        it("各エラーコードに対応したメッセージを返す", () => {
            // 異なるエラーコードのテストケース
            const testCases = [
                {
                    code: GitHubCLIErrorCode.AUTH_FAILED,
                    expectedMessage: "GitHub CLI の認証に失敗しました",
                },
                {
                    code: GitHubCLIErrorCode.COMMAND_NOT_FOUND,
                    expectedMessage: "GitHub CLI コマンドが見つかりません",
                },
                {
                    code: GitHubCLIErrorCode.API_RATE_LIMIT,
                    expectedMessage: "GitHub API のレート制限に達しました",
                },
            ];

            // 各テストケースを実行
            for (const { code, expectedMessage } of testCases) {
                const error = new GitHubCLIError(code, "original message");
                const friendlyMessage = error.getUserFriendlyMessage();
                expect(friendlyMessage).toContain(expectedMessage);
            }
        });
    });
});

describe("ErrorHandler", () => {
    describe("handleError", () => {
        it("既存のGitHubCLIErrorをそのまま返す", () => {
            // 既存のGitHubCLIErrorを作成
            const originalError = new GitHubCLIError(
                GitHubCLIErrorCode.AUTH_FAILED,
                "テストエラー"
            );

            // エラーハンドリングを実行
            const result = ErrorHandler.handleError(originalError);

            // 同じインスタンスが返されることを確認
            expect(result).toBe(originalError);
        });

        it("標準Errorを適切に分類する", () => {
            // 認証エラーメッセージを含む標準Error
            const authError = new Error("not logged in to github.com");

            // エラーハンドリングを実行
            const result = ErrorHandler.handleError(authError, "gh repo list");

            // GitHubCLIErrorに変換されることを確認
            expect(result).toBeInstanceOf(GitHubCLIError);
            expect(result.code).toBe(GitHubCLIErrorCode.AUTH_MISSING);
            expect(result.originalError).toBe(authError);
            expect(result.command).toBe("gh repo list");
            expect(result.suggestion).toContain("gh auth login");
        });

        it("文字列エラーを適切に処理する", () => {
            // 文字列エラー
            const stringError = "Unknown error occurred";

            // エラーハンドリングを実行
            const result = ErrorHandler.handleError(stringError);

            // GitHubCLIErrorに変換されることを確認
            expect(result).toBeInstanceOf(GitHubCLIError);
            expect(result.code).toBe(GitHubCLIErrorCode.UNKNOWN_ERROR);
            expect(result.message).toBe(stringError);
        });

        it("その他の型のエラーを適切に処理する", () => {
            // オブジェクトエラー
            const objectError = { type: "custom error" };

            // エラーハンドリングを実行
            const result = ErrorHandler.handleError(objectError);

            // GitHubCLIErrorに変換されることを確認
            expect(result).toBeInstanceOf(GitHubCLIError);
            expect(result.code).toBe(GitHubCLIErrorCode.UNKNOWN_ERROR);
        });
    });

    describe("classifyError（エラー分類）", () => {
        it("認証エラーを正しく分類する", () => {
            // 認証関連のエラーメッセージをテスト
            const authErrors = [
                "not logged in to github.com",
                "authentication failed",
                "Authentication required",
            ];

            for (const message of authErrors) {
                const error = new Error(message);
                const result = ErrorHandler.handleError(error);

                expect(result.code).toBe(GitHubCLIErrorCode.AUTH_MISSING);
                expect(result.suggestion).toContain("gh auth login");
            }
        });

        it("コマンド未発見エラーを正しく分類する", () => {
            // コマンド未発見のエラーメッセージをテスト
            const commandNotFoundErrors = [
                "command not found: gh",
                "gh: not found",
                "Command not found",
            ];

            for (const message of commandNotFoundErrors) {
                const error = new Error(message);
                const result = ErrorHandler.handleError(error);

                expect(result.code).toBe(GitHubCLIErrorCode.COMMAND_NOT_FOUND);
                expect(result.suggestion).toContain(
                    "GitHub CLI がインストールされているか確認"
                );
            }
        });

        it("ネットワークエラーを正しく分類する", () => {
            // ネットワーク関連のエラーメッセージをテスト
            const networkErrors = [
                "network error",
                "connection timeout",
                "Connection failed",
            ];

            for (const message of networkErrors) {
                const error = new Error(message);
                const result = ErrorHandler.handleError(error);

                expect(result.code).toBe(GitHubCLIErrorCode.NETWORK_ERROR);
                expect(result.suggestion).toContain("ネットワーク接続を確認");
            }
        });

        it("レート制限エラーを正しく分類する", () => {
            // レート制限のエラーメッセージをテスト
            const rateLimitErrors = [
                "rate limit exceeded",
                "API rate limit reached",
                "Rate limit error",
            ];

            for (const message of rateLimitErrors) {
                const error = new Error(message);
                const result = ErrorHandler.handleError(error);

                expect(result.code).toBe(GitHubCLIErrorCode.API_RATE_LIMIT);
                expect(result.suggestion).toContain(
                    "しばらく時間をおいてから再試行"
                );
            }
        });

        it("分類できないエラーを実行失敗として処理する", () => {
            // 分類できない一般的なエラー
            const genericError = new Error("Some unknown error");

            // エラーハンドリングを実行
            const result = ErrorHandler.handleError(genericError);

            // 実行失敗として分類されることを確認
            expect(result.code).toBe(GitHubCLIErrorCode.EXECUTION_FAILED);
            expect(result.originalError).toBe(genericError);
        });
    });

    describe("isRecoverable", () => {
        it("復旧可能なエラーに対してtrueを返す", () => {
            // 復旧可能なエラーコードをテスト
            const recoverableErrors = [
                GitHubCLIErrorCode.TIMEOUT,
                GitHubCLIErrorCode.NETWORK_ERROR,
                GitHubCLIErrorCode.API_UNAVAILABLE,
            ];

            for (const code of recoverableErrors) {
                const error = new GitHubCLIError(code, "test error");
                expect(ErrorHandler.isRecoverable(error)).toBe(true);
            }
        });

        it("復旧不可能なエラーに対してfalseを返す", () => {
            // 復旧不可能なエラーコードをテスト
            const nonRecoverableErrors = [
                GitHubCLIErrorCode.AUTH_FAILED,
                GitHubCLIErrorCode.VALIDATION_ERROR,
                GitHubCLIErrorCode.COMMAND_NOT_FOUND,
            ];

            for (const code of nonRecoverableErrors) {
                const error = new GitHubCLIError(code, "test error");
                expect(ErrorHandler.isRecoverable(error)).toBe(false);
            }
        });
    });

    describe("requiresUserAction", () => {
        it("ユーザーアクションが必要なエラーに対してtrueを返す", () => {
            // ユーザーアクションが必要なエラーコードをテスト
            const userActionErrors = [
                GitHubCLIErrorCode.AUTH_MISSING,
                GitHubCLIErrorCode.AUTH_EXPIRED,
                GitHubCLIErrorCode.COMMAND_NOT_FOUND,
                GitHubCLIErrorCode.VALIDATION_ERROR,
            ];

            for (const code of userActionErrors) {
                const error = new GitHubCLIError(code, "test error");
                expect(ErrorHandler.requiresUserAction(error)).toBe(true);
            }
        });

        it("ユーザーアクションが不要なエラーに対してfalseを返す", () => {
            // ユーザーアクションが不要なエラーコードをテスト
            const autoRecoverableErrors = [
                GitHubCLIErrorCode.TIMEOUT,
                GitHubCLIErrorCode.NETWORK_ERROR,
                GitHubCLIErrorCode.API_RATE_LIMIT,
            ];

            for (const code of autoRecoverableErrors) {
                const error = new GitHubCLIError(code, "test error");
                expect(ErrorHandler.requiresUserAction(error)).toBe(false);
            }
        });
    });
});

// EOF
