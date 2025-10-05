/**
 * GitHub CLI Issue操作コマンド
 */
import { authManager } from "../core/authentication.js";
import { githubCLI } from "../core/command-executor.js";
import type { GitHubCLIResponse } from "../types/common.js";

// Issue情報の型定義
export type IssueInfo = {
    number: number;
    title: string;
    body?: string;
    state: "open" | "closed";
    user: {
        login: string;
        avatar_url: string;
    };
    assignees: Array<{
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
        description?: string;
        state: "open" | "closed";
        due_on?: string;
    };
    html_url: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    comments: number;
    locked: boolean;
    state_reason?: string;
};

// Issue作成オプション
export type CreateIssueOptions = {
    title?: string;
    body?: string;
    assignee?: string[];
    label?: string[];
    milestone?: string;
    project?: string;
    template?: string;
    web?: boolean;
};

// Issue検索オプション
export type SearchIssueOptions = {
    state?: "open" | "closed" | "all";
    author?: string;
    assignee?: string;
    mention?: string;
    label?: string[];
    milestone?: string;
    limit?: number;
    search?: string;
    since?: string;
};

// Issue操作クラス
export class IssueCommands {
    // Issue一覧の取得
    async listIssues(
        _repository?: string,
        options: SearchIssueOptions = {}
    ): Promise<GitHubCLIResponse<IssueInfo[]>> {
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
        if (options.mention) {
            flags.mention = options.mention;
        }
        if (options.label) {
            flags.label = options.label.join(",");
        }
        if (options.milestone) {
            flags.milestone = options.milestone;
        }
        if (options.limit) {
            flags.limit = options.limit;
        }
        if (options.search) {
            flags.search = options.search;
        }
        if (options.since) {
            flags.since = options.since;
        }

        // repositoryパラメータによってargsが変わるが、実際はflagsで処理

        return await githubCLI.execute<IssueInfo[]>({
            command: "issue",
            args: ["list"],
            flags,
        });
    }

    // Issue詳細の取得
    async getIssue(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<IssueInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<IssueInfo>({
            command: "issue",
            args: ["view", number.toString()],
            flags,
        });
    }

    // Issueの作成
    async createIssue(
        options: CreateIssueOptions = {}
    ): Promise<GitHubCLIResponse<IssueInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        // オプションをフラグに変換
        if (options.title) {
            flags.title = options.title;
        }
        if (options.body) {
            flags.body = options.body;
        }
        if (options.assignee) {
            flags.assignee = options.assignee.join(",");
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
        if (options.web) {
            flags.web = true;
        }

        // ウェブインターフェースを使用しない場合はJSONフォーマットを指定
        if (!options.web) {
            flags.json = true;
        }

        return await githubCLI.execute<IssueInfo>({
            command: "issue",
            args: ["create"],
            flags,
        });
    }

    // Issueの編集
    async editIssue(
        number: number,
        options: {
            title?: string;
            body?: string;
            assignee?: string[];
            label?: string[];
            milestone?: string;
            addAssignee?: string[];
            removeAssignee?: string[];
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
        if (options.assignee) {
            flags.assignee = options.assignee.join(",");
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
        if (options.addLabel) {
            flags["add-label"] = options.addLabel.join(",");
        }
        if (options.removeLabel) {
            flags["remove-label"] = options.removeLabel.join(",");
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["edit", number.toString()],
            flags,
        });
    }

    // Issueのクローズ
    async closeIssue(
        number: number,
        options: {
            comment?: string;
            reason?: "completed" | "not_planned";
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
        if (options.reason) {
            flags.reason = options.reason;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["close", number.toString()],
            flags,
        });
    }

    // Issueの再オープン
    async reopenIssue(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};
        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["reopen", number.toString()],
            flags,
        });
    }

    // Issueにコメントを追加
    async commentOnIssue(
        number: number,
        comment: string,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            body: comment,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["comment", number.toString()],
            flags,
        });
    }

    // Issueをブラウザで開く
    async openIssue(
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
            command: "issue",
            args: ["view", number.toString()],
            flags,
        });
    }

    // Issue番号をピン留め
    async pinIssue(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};
        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["pin", number.toString()],
            flags,
        });
    }

    // Issue番号のピン留め解除
    async unpinIssue(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};
        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["unpin", number.toString()],
            flags,
        });
    }

    // Issueをロック
    async lockIssue(
        number: number,
        reason?: "off-topic" | "too heated" | "resolved" | "spam",
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (repository) {
            flags.repo = repository;
        }
        if (reason) {
            flags.reason = reason;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["lock", number.toString()],
            flags,
        });
    }

    // Issueのロック解除
    async unlockIssue(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};
        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<string>({
            command: "issue",
            args: ["unlock", number.toString()],
            flags,
        });
    }

    // Issueを自分にアサイン
    async assignToSelf(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        // 現在のユーザー名を取得
        const currentUser = await authManager.getCurrentUser();
        if (!currentUser) {
            throw new Error("現在のユーザー情報を取得できませんでした");
        }

        return await this.editIssue(
            number,
            { addAssignee: [currentUser] },
            repository
        );
    }

    // 自分のアサインを解除
    async unassignFromSelf(
        number: number,
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        // 現在のユーザー名を取得
        const currentUser = await authManager.getCurrentUser();
        if (!currentUser) {
            throw new Error("現在のユーザー情報を取得できませんでした");
        }

        return await this.editIssue(
            number,
            { removeAssignee: [currentUser] },
            repository
        );
    }

    // 自分がアサインされているIssue一覧
    async getMyAssignedIssues(
        repository?: string
    ): Promise<GitHubCLIResponse<IssueInfo[]>> {
        const currentUser = await authManager.getCurrentUser();
        if (!currentUser) {
            throw new Error("現在のユーザー情報を取得できませんでした");
        }

        return await this.listIssues(repository, {
            assignee: currentUser,
            state: "open",
        });
    }

    // 自分が作成したIssue一覧
    async getMyCreatedIssues(
        repository?: string
    ): Promise<GitHubCLIResponse<IssueInfo[]>> {
        const currentUser = await authManager.getCurrentUser();
        if (!currentUser) {
            throw new Error("現在のユーザー情報を取得できませんでした");
        }

        return await this.listIssues(repository, {
            author: currentUser,
            state: "all",
        });
    }

    // ラベル管理
    async listLabels(repository?: string): Promise<GitHubCLIResponse<any[]>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<any[]>({
            command: "label",
            args: ["list"],
            flags,
        });
    }

    // マイルストーン管理
    async listMilestones(
        repository?: string
    ): Promise<GitHubCLIResponse<any[]>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        if (repository) {
            flags.repo = repository;
        }

        return await githubCLI.execute<any[]>({
            command: "api",
            args: repository
                ? [`repos/${repository}/milestones`]
                : ["repos/:owner/:repo/milestones"],
        });
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const issueCommands = new IssueCommands();

// EOF
