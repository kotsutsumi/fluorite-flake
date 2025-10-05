/**
 * GitHub CLI リポジトリ操作コマンド
 */
import { authManager } from "../core/authentication.js";
import { githubCLI } from "../core/command-executor.js";
import type { GitHubCLIResponse } from "../types/common.js";

// リポジトリ情報の型定義
export type RepositoryInfo = {
    name: string;
    full_name: string;
    description?: string;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    default_branch: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language?: string;
    forks_count: number;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license?: {
        key: string;
        name: string;
        spdx_id: string;
    };
    topics: string[];
};

// リポジトリ作成オプション
export type CreateRepositoryOptions = {
    description?: string;
    private?: boolean;
    gitignore?: string;
    license?: string;
    readme?: boolean;
    template?: string;
    org?: string;
};

// リポジトリクローンオプション
export type CloneRepositoryOptions = {
    directory?: string;
    branch?: string;
    depth?: number;
    recursive?: boolean;
};

// リポジトリ操作クラス
export class RepositoryCommands {
    // リポジトリ情報の取得
    async getRepository(
        owner: string,
        repo: string
    ): Promise<GitHubCLIResponse<RepositoryInfo>> {
        await authManager.requireAuth();

        return await githubCLI.execute<RepositoryInfo>({
            command: "repo",
            args: ["view", `${owner}/${repo}`],
            flags: {
                json: true,
            },
        });
    }

    // 現在のリポジトリ情報を取得
    async getCurrentRepository(): Promise<GitHubCLIResponse<RepositoryInfo>> {
        await authManager.requireAuth();

        return await githubCLI.execute<RepositoryInfo>({
            command: "repo",
            args: ["view"],
            flags: {
                json: true,
            },
        });
    }

    // リポジトリ一覧の取得
    async listRepositories(
        _owner?: string,
        options: {
            limit?: number;
            public?: boolean;
            private?: boolean;
            fork?: boolean;
            source?: boolean;
            archived?: boolean;
        } = {}
    ): Promise<GitHubCLIResponse<RepositoryInfo[]>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        // オプションをフラグに変換
        if (options.limit) {
            flags.limit = options.limit;
        }
        if (options.public) {
            flags.public = true;
        }
        if (options.private) {
            flags.private = true;
        }
        if (options.fork) {
            flags.fork = true;
        }
        if (options.source) {
            flags.source = true;
        }
        if (options.archived) {
            flags.archived = true;
        }

        // ownerパラメータによってargsが変わるが、実際はflagsで処理

        return await githubCLI.execute<RepositoryInfo[]>({
            command: "repo",
            args: ["list"],
            flags,
        });
    }

    // リポジトリの作成
    async createRepository(
        name: string,
        options: CreateRepositoryOptions = {}
    ): Promise<GitHubCLIResponse<RepositoryInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        // オプションをフラグに変換
        if (options.description) {
            flags.description = options.description;
        }
        if (options.private) {
            flags.private = true;
        }
        if (options.gitignore) {
            flags.gitignore = options.gitignore;
        }
        if (options.license) {
            flags.license = options.license;
        }
        if (options.readme) {
            flags["add-readme"] = true;
        }
        if (options.template) {
            flags.template = options.template;
        }

        const args = options.org
            ? ["create", `${options.org}/${name}`]
            : ["create", name];

        return await githubCLI.execute<RepositoryInfo>({
            command: "repo",
            args,
            flags,
        });
    }

    // リポジトリのクローン
    async cloneRepository(
        repository: string,
        options: CloneRepositoryOptions = {}
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        // オプションをフラグに変換
        if (options.branch) {
            flags.branch = options.branch;
        }
        if (options.depth) {
            flags.depth = options.depth;
        }
        if (options.recursive) {
            flags.recursive = true;
        }

        const args = options.directory
            ? ["clone", repository, options.directory]
            : ["clone", repository];

        return await githubCLI.execute<string>({
            command: "repo",
            args,
            flags,
        });
    }

    // リポジトリのフォーク
    async forkRepository(
        repository: string,
        options: {
            org?: string;
            clone?: boolean;
            remote?: boolean;
        } = {}
    ): Promise<GitHubCLIResponse<RepositoryInfo>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {
            json: true,
        };

        // オプションをフラグに変換
        if (options.org) {
            flags.org = options.org;
        }
        if (options.clone) {
            flags.clone = true;
        }
        if (options.remote) {
            flags.remote = true;
        }

        return await githubCLI.execute<RepositoryInfo>({
            command: "repo",
            args: ["fork", repository],
            flags,
        });
    }

    // リポジトリの削除
    async deleteRepository(
        repository: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["delete", repository],
            flags: {
                confirm: true,
            },
        });
    }

    // リポジトリのアーカイブ
    async archiveRepository(
        repository: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["archive", repository],
        });
    }

    // リポジトリのアーカイブ解除
    async unarchiveRepository(
        repository: string
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["unarchive", repository],
        });
    }

    // リポジトリの可視性変更（公開/非公開）
    async setVisibility(
        repository: string,
        visibility: "public" | "private"
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["edit", repository],
            flags: {
                visibility,
            },
        });
    }

    // リポジトリの説明とWebサイトを更新
    async updateRepository(
        repository: string,
        options: {
            description?: string;
            homepage?: string;
            topics?: string[];
        }
    ): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        const flags: Record<string, any> = {};

        if (options.description) {
            flags.description = options.description;
        }
        if (options.homepage) {
            flags.homepage = options.homepage;
        }
        if (options.topics) {
            flags["add-topic"] = options.topics.join(",");
        }

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["edit", repository],
            flags,
        });
    }

    // リポジトリのブラウザで開く
    async openRepository(
        repository?: string
    ): Promise<GitHubCLIResponse<string>> {
        const args = repository
            ? ["view", repository, "--web"]
            : ["view", "--web"];

        return await githubCLI.execute<string>({
            command: "repo",
            args,
        });
    }

    // リポジトリの同期（フォークの場合）
    async syncFork(): Promise<GitHubCLIResponse<string>> {
        await authManager.requireAuth();

        return await githubCLI.execute<string>({
            command: "repo",
            args: ["sync"],
        });
    }

    // リポジトリのコラボレーター一覧
    async listCollaborators(
        repository?: string
    ): Promise<GitHubCLIResponse<any[]>> {
        await authManager.requireAuth();

        return await githubCLI.execute<any[]>({
            command: "api",
            args: repository
                ? [`repos/${repository}/collaborators`]
                : ["repos/:owner/:repo/collaborators"],
        });
    }
}

// デフォルトエクスポート用のシングルトンインスタンス
export const repositoryCommands = new RepositoryCommands();

// EOF
