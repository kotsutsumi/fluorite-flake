/**
 * GitHub CLI Node.js ラッパー
 *
 * GitHub CLIの機能をNode.jsから使いやすくするためのラッパーライブラリ
 */

export type {
    CreateIssueOptions,
    IssueInfo,
    SearchIssueOptions,
} from "./commands/issue.js";
export {
    IssueCommands,
    issueCommands,
} from "./commands/issue.js";
export type {
    CreatePullRequestOptions,
    PullRequestInfo,
    SearchPullRequestOptions,
} from "./commands/pull-request.js";
export {
    PullRequestCommands,
    pullRequestCommands,
} from "./commands/pull-request.js";
// コマンド機能をインポート・エクスポート
export type {
    CloneRepositoryOptions,
    CreateRepositoryOptions,
    RepositoryInfo,
} from "./commands/repository.js";
export {
    RepositoryCommands,
    repositoryCommands,
} from "./commands/repository.js";
// コア機能をインポート・エクスポート
export {
    AuthenticationManager,
    authManager,
} from "./core/authentication.js";
export {
    GitHubCLIExecutor,
    githubCLI,
} from "./core/command-executor.js";
export {
    GitHubCLIError as GitHubCLIErrorClass,
    handleError,
    isRecoverable,
    requiresUserAction,
} from "./core/error-handler.js";
// 型定義をインポート・エクスポート
export type {
    AuthStatus,
    CommandStatus,
    ExecutionOptions,
    GitHubCLICommand,
    GitHubCLIError,
    GitHubCLIResponse,
} from "./types/common.js";
export { GitHubCLIErrorCode } from "./types/common.js";

import type { CreateIssueOptions, IssueInfo } from "./commands/issue.js";
import { issueCommands } from "./commands/issue.js";
import type {
    CreatePullRequestOptions,
    PullRequestInfo,
} from "./commands/pull-request.js";
import { pullRequestCommands } from "./commands/pull-request.js";
import type { RepositoryInfo } from "./commands/repository.js";
import { repositoryCommands } from "./commands/repository.js";
// 内部使用のためのインポート
import { authManager } from "./core/authentication.js";
import { githubCLI } from "./core/command-executor.js";
import type { AuthStatus, GitHubCLIResponse } from "./types/common.js";

// 統合クライアントクラス
export class GitHubCLI {
    // 認証管理
    readonly auth = authManager;

    // コマンド実行エンジン
    readonly executor = githubCLI;

    // リポジトリ操作
    readonly repository = repositoryCommands;

    // プルリクエスト操作
    readonly pullRequest = pullRequestCommands;

    // Issue操作
    readonly issue = issueCommands;

    // 統合メソッド: GitHub CLIの利用可能性チェック
    async isAvailable(): Promise<boolean> {
        return await this.executor.checkInstallation();
    }

    // 統合メソッド: GitHub CLIのバージョン取得
    async getVersion(): Promise<string | null> {
        return await this.executor.getVersion();
    }

    // 統合メソッド: 認証状態の確認
    async checkAuth(): Promise<AuthStatus> {
        return await this.auth.checkAuthStatus();
    }

    // 統合メソッド: セットアップ確認
    async checkSetup(): Promise<{
        isInstalled: boolean;
        version: string | null;
        isAuthenticated: boolean;
        username: string | null;
    }> {
        const isInstalled = await this.isAvailable();
        const version = await this.getVersion();
        const authStatus = await this.checkAuth();

        return {
            isInstalled,
            version,
            isAuthenticated: authStatus.isAuthenticated,
            username: authStatus.username || null,
        };
    }

    // 統合メソッド: 現在のリポジトリの情報を取得
    async getCurrentRepoInfo(): Promise<{
        repository: RepositoryInfo | null;
        openPullRequests: PullRequestInfo[];
        openIssues: IssueInfo[];
    }> {
        try {
            const repoResult = await this.repository.getCurrentRepository();
            const repository = repoResult.success
                ? repoResult.data || null
                : null;

            const prResult = await this.pullRequest.listPullRequests(
                undefined,
                { state: "open" }
            );
            const openPullRequests = prResult.success
                ? prResult.data || []
                : [];

            const issueResult = await this.issue.listIssues(undefined, {
                state: "open",
            });
            const openIssues = issueResult.success
                ? issueResult.data || []
                : [];

            return {
                repository,
                openPullRequests,
                openIssues,
            };
        } catch (error) {
            return {
                repository: null,
                openPullRequests: [],
                openIssues: [],
            };
        }
    }

    // 統合メソッド: クイックPR作成
    async createQuickPR(
        title: string,
        body?: string,
        options: {
            base?: string;
            draft?: boolean;
            assignToSelf?: boolean;
        } = {}
    ): Promise<GitHubCLIResponse<PullRequestInfo>> {
        const createOptions: CreatePullRequestOptions = {
            title,
            body,
            base: options.base,
            draft: options.draft,
        };

        if (options.assignToSelf) {
            const currentUser = await this.auth.getCurrentUser();
            if (currentUser) {
                createOptions.assignee = [currentUser];
            }
        }

        return await this.pullRequest.createPullRequest(createOptions);
    }

    // 統合メソッド: クイックIssue作成
    async createQuickIssue(
        title: string,
        body?: string,
        options: {
            labels?: string[];
            assignToSelf?: boolean;
        } = {}
    ): Promise<GitHubCLIResponse<IssueInfo>> {
        const createOptions: CreateIssueOptions = {
            title,
            body,
            label: options.labels,
        };

        if (options.assignToSelf) {
            const currentUser = await this.auth.getCurrentUser();
            if (currentUser) {
                createOptions.assignee = [currentUser];
            }
        }

        return await this.issue.createIssue(createOptions);
    }

    // 統合メソッド: デバッグ情報の表示
    async showDebugInfo(): Promise<void> {
        console.log("🔧 GitHub CLI デバッグ情報\n");

        const setup = await this.checkSetup();

        console.log("📦 インストール状況:");
        console.log(`  インストール済み: ${setup.isInstalled ? "✅" : "❌"}`);
        console.log(`  バージョン: ${setup.version || "不明"}\n`);

        console.log("🔐 認証状況:");
        console.log(`  認証済み: ${setup.isAuthenticated ? "✅" : "❌"}`);
        console.log(`  ユーザー名: ${setup.username || "不明"}\n`);

        if (setup.isAuthenticated) {
            await this.auth.showAuthInfo();
        }

        try {
            const repoInfo = await this.getCurrentRepoInfo();
            if (repoInfo.repository) {
                console.log("\n📁 現在のリポジトリ:");
                console.log(`  名前: ${repoInfo.repository.full_name}`);
                console.log(
                    `  説明: ${repoInfo.repository.description || "（説明なし）"}`
                );
                console.log(
                    `  プライベート: ${repoInfo.repository.private ? "はい" : "いいえ"}`
                );
                console.log(
                    `  開いているPR: ${repoInfo.openPullRequests.length}個`
                );
                console.log(
                    `  開いているIssue: ${repoInfo.openIssues.length}個`
                );
            }
        } catch (error) {
            console.log("\n📁 現在のリポジトリ: Gitリポジトリではありません");
        }
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const github = new GitHubCLI();

// 便利な関数エクスポート
export const gh = github; // 短縮形

// EOF
