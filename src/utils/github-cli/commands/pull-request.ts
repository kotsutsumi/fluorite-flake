/**
 * GitHub CLI プルリクエスト操作コマンド
 */
import { authManager } from "../core/authentication.js";
import { githubCLI } from "../core/command-executor.js";
import type { GitHubCLIResponse } from "../types/common.js";

// プルリクエスト情報の型定義
export type PullRequestInfo = {
    number: number;
    title: string;
    body?: string;
    state: "open" | "closed" | "merged";
    user: {
        login: string;
        avatar_url: string;
    };
    head: {
        ref: string;
        sha: string;
        repo: {
            name: string;
            full_name: string;
        };
    };
    base: {
        ref: string;
        sha: string;
        repo: {
            name: string;
            full_name: string;
        };
    };
    html_url: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    merged_at?: string;
    merge_commit_sha?: string;
    assignees: Array<{
        login: string;
        avatar_url: string;
    }>;
    reviewers: Array<{
        login: string;
        avatar_url: string;
    }>;
    labels: Array<{
        name: string;
        color: string;
        description?: string;
    }>;
    milestone?: {
        title: string;
        number: number;
    };
    draft: boolean;
    mergeable: boolean | null;
    mergeable_state: string;
    merged: boolean;
    comments: number;
    review_comments: number;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
};

// プルリクエスト作成オプション
export type CreatePullRequestOptions = {
    title?: string;
    body?: string;
    base?: string;
    head?: string;
    draft?: boolean;
    assignee?: string[];
    reviewer?: string[];
    label?: string[];
    milestone?: string;
    project?: string;
    template?: string;
};

// プルリクエスト検索オプション
export type SearchPullRequestOptions = {
    state?: "open" | "closed" | "merged" | "all";
    author?: string;
    assignee?: string;
    reviewer?: string;
    label?: string[];
    milestone?: string;
    base?: string;
    head?: string;
    limit?: number;
    search?: string;
};

// プルリクエスト操作クラス
export class PullRequestCommands {
    // プルリクエスト一覧の取得
    async listPullRequests(
        _repository?: string,
        options: SearchPullRequestOptions = {}
    ): Promise<GitHubCLIResponse<PullRequestInfo[]>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        // オプションをフラグに変換
        if (options.state) {
            flags.state = options.state;
        }
        if (options.author) {
            flags.author = options.author;
        }
        if (options.assignee) {
            flags.assignee = options.assignee;
        }
        if (options.reviewer) {
            flags.reviewer = options.reviewer;
        }
        if (options.label) {
            flags.label = options.label.join(",");
        }
        if (options.milestone) {
            flags.milestone = options.milestone;
        }
        if (options.base) {
            flags.base = options.base;
        }
        if (options.head) {
            flags.head = options.head;
        }
        if (options.limit) {
            flags.limit = options.limit;
        }
        if (options.search) {
            flags.search = options.search;
        }

        // repositoryパラメータによってargsが変わるが、実際はflagsで処理

        return await githubCLI.execute<PullRequestInfo[]>({
            command: "pr",
            args: ["list"],
            flags,
        });
    }

    // プルリクエスト詳細の取得
    async getPullRequest(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<PullRequestInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<PullRequestInfo>({
            command: "pr",
            args: ["view", number.toString()],
            flags,
        });
    }

    // プルリクエストの作成
    async createPullRequest(
        options: CreatePullRequestOptions = {}
    ): Promise<GitHubCLIResponse<PullRequestInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        // オプションをフラグに変換
        if (options.title) {
            flags.title = options.title;
        }
        if (options.body) {
            flags.body = options.body;
        }
        if (options.base) {
            flags.base = options.base;
        }
        if (options.head) {
            flags.head = options.head;
        }
        if (options.draft) {
            flags.draft = true;
        }
        if (options.assignee) {
            flags.assignee = options.assignee.join(",");
        }
        if (options.reviewer) {
            flags.reviewer = options.reviewer.join(",");
        }
        if (options.label) {
            flags.label = options.label.join(",");
        }
        if (options.milestone) {
            flags.milestone = options.milestone;
        }
        if (options.project) {
            flags.project = options.project;
        }
        if (options.template) {
            flags.template = options.template;
        }

        return await githubCLI.execute<PullRequestInfo>({
            command: "pr",
            args: ["create"],
            flags,
        });
    }

    // プルリクエストの編集
    async editPullRequest(
        number: number,
        options: {
            title?: string;
            body?: string;
            base?: string;
            assignee?: string[];
            reviewer?: string[];
            label?: string[];
            milestone?: string;
            addAssignee?: string[];
            removeAssignee?: string[];
            addReviewer?: string[];
            removeReviewer?: string[];
            addLabel?: string[];
            removeLabel?: string[];
        },
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.title) {
            flags.title = options.title;
        }
        if (options.body) {
            flags.body = options.body;
        }
        if (options.base) {
            flags.base = options.base;
        }
        if (options.assignee) {
            flags.assignee = options.assignee.join(",");
        }
        if (options.reviewer) {
            flags.reviewer = options.reviewer.join(",");
        }
        if (options.label) {
            flags.label = options.label.join(",");
        }
        if (options.milestone) {
            flags.milestone = options.milestone;
        }
        if (options.addAssignee) {
            flags["add-assignee"] = options.addAssignee.join(",");
        }
        if (options.removeAssignee) {
            flags["remove-assignee"] = options.removeAssignee.join(",");
        }
        if (options.addReviewer) {
            flags["add-reviewer"] = options.addReviewer.join(",");
        }
        if (options.removeReviewer) {
            flags["remove-reviewer"] = options.removeReviewer.join(",");
        }
        if (options.addLabel) {
            flags["add-label"] = options.addLabel.join(",");
        }
        if (options.removeLabel) {
            flags["remove-label"] = options.removeLabel.join(",");
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["edit", number.toString()],
            flags,
        });
    }

    // プルリクエストのマージ
    async mergePullRequest(
        number: number,
        options: {
            mergeMethod?: "merge" | "squash" | "rebase";
            title?: string;
            body?: string;
            deleteLocal?: boolean;
            deleteRemote?: boolean;
        } = {},
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.mergeMethod) {
            switch (options.mergeMethod) {
                case "squash":
                    flags.squash = true;
                    break;
                case "rebase":
                    flags.rebase = true;
                    break;
                default:
                    flags.merge = true;
            }
        }
        if (options.title) {
            flags.subject = options.title;
        }
        if (options.body) {
            flags.body = options.body;
        }
        if (options.deleteLocal) {
            flags["delete-branch"] = true;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["merge", number.toString()],
            flags,
        });
    }

    // プルリクエストのクローズ
    async closePullRequest(
        number: number,
        options: {
            comment?: string;
            deleteLocal?: boolean;
        } = {},
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.comment) {
            flags.comment = options.comment;
        }
        if (options.deleteLocal) {
            flags["delete-branch"] = true;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["close", number.toString()],
            flags,
        });
    }

    // プルリクエストの再オープン
    async reopenPullRequest(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};
        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["reopen", number.toString()],
            flags,
        });
    }

    // プルリクエストのチェックアウト
    async checkoutPullRequest(
        number: number,
        options: {
            branch?: string;
            force?: boolean;
        } = {},
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.branch) {
            flags.branch = options.branch;
        }
        if (options.force) {
            flags.force = true;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["checkout", number.toString()],
            flags,
        });
    }

    // プルリクエストのdiffを表示
    async showPullRequestDiff(
        number: number,
        options: {
            nameOnly?: boolean;
            patch?: boolean;
        } = {},
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.nameOnly) {
            flags["name-only"] = true;
        }
        if (options.patch) {
            flags.patch = true;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["diff", number.toString()],
            flags,
        });
    }

    // プルリクエストのレビュー
    async reviewPullRequest(
        number: number,
        options: {
            approve?: boolean;
            requestChanges?: boolean;
            comment?: boolean;
            body?: string;
        },
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (options.body) {
            flags.body = options.body;
        }

        if (options.approve) {
            flags.approve = true;
        } else if (options.requestChanges) {
            flags["request-changes"] = true;
        } else if (options.comment) {
            flags.comment = true;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["review", number.toString()],
            flags,
        });
    }

    // プルリクエストをブラウザで開く
    async openPullRequest(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        const flags: Record<string, any> = {
            web: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "pr",
            args: ["view", number.toString()],
            flags,
        });
    }

    // プルリクエストのステータスチェック
    async checkPullRequestStatus(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<any>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<any>({
            command: "pr",
            args: ["checks", number.toString()],
            flags,
        });
    }

    // 現在のブランチからプルリクエストを作成
    async createPullRequestFromCurrentBranch(
        options: CreatePullRequestOptions = {}
    ): Promise<GitHubCLIResponse<PullRequestInfo>> {
        // 現在のブランチ情報を取得
        const currentBranch = await this.getCurrentBranch();
        if (currentBranch.success && currentBranch.data) {
            options.head = currentBranch.data;
        }

        return await this.createPullRequest(options);
    }

    // 現在のブランチ名を取得
    private async getCurrentBranch(): Promise<GitHubCLIResponse<string>> {
        return await githubCLI.executeRaw("git branch --show-current");
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const pullRequestCommands = new PullRequestCommands();

// EOF
