/**
 * GitHub CLI 認証管理システム
 */
import type { AuthStatus } from "../types/common.js";
import { GitHubCLIErrorCode } from "../types/common.js";
import { githubCLI } from "./command-executor.js";
import { GitHubCLIError } from "./error-handler.js";

// 認証管理クラス
export class AuthenticationManager {
    private cachedAuthStatus: AuthStatus | null = null;
    private cacheExpiry = 0;
    private readonly cacheTimeout = 300_000; // 5分

    // 認証ステータスの取得
    async checkAuthStatus(): Promise<AuthStatus> {
        // キャッシュが有効な場合は返す
        if (this.cachedAuthStatus && Date.now() < this.cacheExpiry) {
            return this.cachedAuthStatus;
        }

        try {
            // GitHub CLI の認証状態を確認
            const result = await githubCLI.executeRaw("gh auth status");

            if (!result.success) {
                // 認証されていない場合
                const authStatus: AuthStatus = {
                    isAuthenticated: false,
                };
                this.updateCache(authStatus);
                return authStatus;
            }

            // 認証情報の解析
            const authStatus = this.parseAuthStatus(result.data || "");
            this.updateCache(authStatus);
            return authStatus;
        } catch (error) {
            throw new GitHubCLIError(GitHubCLIErrorCode.AUTH_FAILED, "認証ステータスの確認に失敗しました", {
                originalError: error instanceof Error ? error : new Error(String(error)),
                suggestion: "gh auth login を実行して認証を行ってください",
            });
        }
    }

    // トークンの妥当性確認
    async validateToken(): Promise<boolean> {
        try {
            // APIリクエストを実行してトークンの有効性を確認
            const result = await githubCLI.executeRaw("gh api user");
            return result.success;
        } catch (error) {
            // トークンが無効または期限切れの場合
            return false;
        }
    }

    // ログイン状態の確認
    async isLoggedIn(): Promise<boolean> {
        const authStatus = await this.checkAuthStatus();
        return authStatus.isAuthenticated;
    }

    // ユーザー情報の取得
    async getCurrentUser(): Promise<string | null> {
        const authStatus = await this.checkAuthStatus();
        return authStatus.username || null;
    }

    // スコープの確認
    async getScopes(): Promise<string[]> {
        const authStatus = await this.checkAuthStatus();
        return authStatus.scopes || [];
    }

    // トークンタイプの取得
    async getTokenType(): Promise<string | null> {
        const authStatus = await this.checkAuthStatus();
        return authStatus.tokenType || null;
    }

    // 認証の強制更新
    async refreshAuthStatus(): Promise<AuthStatus> {
        this.clearCache();
        return await this.checkAuthStatus();
    }

    // テスト用: キャッシュを強制クリア
    clearCacheForTest(): void {
        this.clearCache();
    }

    // ログイン処理のガイド
    async promptLogin(): Promise<void> {
        const isAuthenticated = await this.isLoggedIn();

        if (isAuthenticated) {
            console.log("✅ 既にGitHub CLIにログインしています");
            return;
        }

        console.log("🔐 GitHub CLI にログインが必要です");
        console.log("以下のコマンドを実行してください:");
        console.log("  gh auth login");
        console.log("");
        console.log("ブラウザでのログイン:");
        console.log("  gh auth login --web");
        console.log("");
        console.log("トークンでのログイン:");
        console.log("  gh auth login --with-token");

        throw new GitHubCLIError(GitHubCLIErrorCode.AUTH_MISSING, "GitHub CLI の認証が必要です", {
            suggestion: "上記のコマンドを使用してログインしてください",
        });
    }

    // ユーザー名を抽出
    private parseUsername(line: string): string | undefined {
        if (line.includes("Logged in to github.com as")) {
            const userMatch = line.match(/as ([^\s]+)/);
            return userMatch ? userMatch[1] : undefined;
        }
        return;
    }

    // トークンタイプを抽出
    private parseTokenType(line: string): "oauth" | "personal_access_token" | undefined {
        if (line.includes("Token:")) {
            if (line.includes("oauth")) {
                return "oauth";
            }
            if (line.includes("personal access token")) {
                return "personal_access_token";
            }
        }
        return;
    }

    // スコープを抽出
    private parseTokenScopes(line: string): string[] | undefined {
        if (line.includes("Token scopes:")) {
            const scopesMatch = line.match(/Token scopes:\s*(.+)/);
            if (scopesMatch) {
                return scopesMatch[1].split(",").map((s) => s.trim());
            }
        }
        return;
    }

    // 認証ステータスの解析
    private parseAuthStatus(output: string): AuthStatus {
        const lines = output.split("\n");
        const authStatus: AuthStatus = {
            isAuthenticated: false,
        };

        for (const line of lines) {
            const trimmedLine = line.trim();

            // ユーザー名の抽出
            const username = this.parseUsername(trimmedLine);
            if (username) {
                authStatus.username = username;
                authStatus.isAuthenticated = true;
            }

            // トークンタイプの抽出
            const tokenType = this.parseTokenType(trimmedLine);
            if (tokenType) {
                authStatus.tokenType = tokenType;
            }

            // スコープの抽出
            const scopes = this.parseTokenScopes(trimmedLine);
            if (scopes) {
                authStatus.scopes = scopes;
            }
        }

        return authStatus;
    }

    // キャッシュの更新
    private updateCache(authStatus: AuthStatus): void {
        this.cachedAuthStatus = authStatus;
        this.cacheExpiry = Date.now() + this.cacheTimeout;
    }

    // キャッシュのクリア
    private clearCache(): void {
        this.cachedAuthStatus = null;
        this.cacheExpiry = 0;
    }

    // 認証が必要な操作の前処理
    async requireAuth(): Promise<void> {
        const isAuthenticated = await this.isLoggedIn();

        if (!isAuthenticated) {
            await this.promptLogin();
        }

        const isValid = await this.validateToken();
        if (!isValid) {
            this.clearCache();
            throw new GitHubCLIError(GitHubCLIErrorCode.AUTH_EXPIRED, "認証トークンが無効または期限切れです", {
                suggestion: "gh auth refresh または gh auth login を実行してください",
            });
        }
    }

    // デバッグ用: 認証情報の表示
    async showAuthInfo(): Promise<void> {
        try {
            const authStatus = await this.checkAuthStatus();

            console.log("🔐 GitHub CLI 認証情報:");
            console.log(`  認証状態: ${authStatus.isAuthenticated ? "✅ ログイン済み" : "❌ 未認証"}`);

            if (authStatus.isAuthenticated) {
                console.log(`  ユーザー名: ${authStatus.username || "不明"}`);
                console.log(`  トークンタイプ: ${authStatus.tokenType || "不明"}`);

                if (authStatus.scopes && authStatus.scopes.length > 0) {
                    console.log(`  スコープ: ${authStatus.scopes.join(", ")}`);
                }

                if (authStatus.expiresAt) {
                    console.log(`  有効期限: ${authStatus.expiresAt.toLocaleString()}`);
                }
            }
        } catch (error) {
            console.error("❌ 認証情報の取得に失敗しました:", error);
        }
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const authManager = new AuthenticationManager();

// EOF
