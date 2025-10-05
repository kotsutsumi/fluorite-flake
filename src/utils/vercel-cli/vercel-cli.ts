import { execSync } from "node:child_process";
import type {
    VercelBuildOptions,
    VercelCommandOptions,
    VercelCommandResult,
    VercelDeployOptions,
    VercelDevOptions,
    VercelDomainOptions,
    VercelEnvOptions,
    VercelLinkOptions,
    VercelListOptions,
    VercelLogsOptions,
    VercelProjectOptions,
    VercelPromoteOptions,
    VercelRemoveOptions,
    VercelRollbackOptions,
} from "./types.js";

/**
 * VercelCLIのNode.jsラッパークラス
 * シェル実行のエラー処理を簡素化し、TypeScript型安全性を提供
 */
export class VercelCLI {
    /**
     * 基本的なVercelコマンドを実行する内部メソッド
     */
    private static executeCommand(
        command: string,
        options: VercelCommandOptions = {}
    ): VercelCommandResult {
        try {
            // グローバルオプションを構築
            const globalArgs = VercelCLI.buildGlobalArgs(options);
            const fullCommand =
                `vercel ${command} ${globalArgs.join(" ")}`.trim();

            // execSyncでコマンド実行
            const stdout = execSync(fullCommand, {
                encoding: "utf8",
                cwd: options.cwd || process.cwd(),
                stdio: ["ignore", "pipe", "pipe"],
            });

            return {
                success: true,
                stdout: stdout.toString().trim(),
                stderr: "",
                exitCode: 0,
                command: fullCommand,
            };
        } catch (error: any) {
            return {
                success: false,
                stdout: error.stdout?.toString() || "",
                stderr: error.stderr?.toString() || error.message || "",
                exitCode: error.status || 1,
                command: `vercel ${command}`,
            };
        }
    }

    /**
     * グローバルオプションを引数配列に変換
     */
    private static buildGlobalArgs(options: VercelCommandOptions): string[] {
        const args: string[] = [];

        if (options.debug) args.push("--debug");
        if (options.globalConfig)
            args.push("--global-config", options.globalConfig);
        if (options.localConfig)
            args.push("--local-config", options.localConfig);
        if (options.scope) args.push("--scope", options.scope);
        if (options.token) args.push("--token", options.token);
        if (options.noColor) args.push("--no-color");
        if (options.yes) args.push("--yes");

        // 追加の引数を末尾に追加
        if (options.args) args.push(...options.args);

        return args;
    }

    /**
     * デプロイ専用オプションを引数配列に変換
     */
    private static buildDeployArgs(options: VercelDeployOptions): string[] {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.prebuilt) args.push("--prebuilt");
        if (options.prod) args.push("--prod");
        if (options.skipDomain) args.push("--skip-domain");
        if (options.public) args.push("--public");
        if (options.noWait) args.push("--no-wait");
        if (options.force) args.push("--force");
        if (options.withCache) args.push("--with-cache");
        if (options.logs) args.push("--logs");
        if (options.name) args.push("--name", options.name);
        if (options.target) args.push("--target", options.target);

        // 配列オプション
        if (options.regions) {
            args.push("--regions", options.regions.join(","));
        }

        // オブジェクトオプション（key=value形式）
        if (options.buildEnv) {
            Object.entries(options.buildEnv).forEach(([key, value]) => {
                args.push("--build-env", `${key}=${value}`);
            });
        }

        if (options.env) {
            Object.entries(options.env).forEach(([key, value]) => {
                args.push("--env", `${key}=${value}`);
            });
        }

        if (options.meta) {
            Object.entries(options.meta).forEach(([key, value]) => {
                args.push("--meta", `${key}=${value}`);
            });
        }

        if (options.archive) args.push(`--archive=${options.archive}`);

        return args;
    }

    /**
     * プロジェクトをデプロイ
     */
    static deploy(
        path?: string,
        options: VercelDeployOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildDeployArgs(options);
        const command = path ? `deploy ${path}` : "deploy";

        try {
            const fullCommand = `vercel ${command} ${args.join(" ")}`.trim();
            const stdout = execSync(fullCommand, {
                encoding: "utf8",
                cwd: options.cwd || process.cwd(),
                stdio: ["ignore", "pipe", "pipe"],
            });

            return {
                success: true,
                stdout: stdout.toString().trim(),
                stderr: "",
                exitCode: 0,
                command: fullCommand,
            };
        } catch (error: any) {
            return {
                success: false,
                stdout: error.stdout?.toString() || "",
                stderr: error.stderr?.toString() || error.message || "",
                exitCode: error.status || 1,
                command: `vercel ${command}`,
            };
        }
    }

    /**
     * デプロイ一覧を取得
     */
    static list(options: VercelListOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.environment)
            args.push("--environment", options.environment);
        if (options.status) args.push("--status", options.status);
        if (options.policy) args.push("--policy", options.policy);

        if (options.meta) {
            Object.entries(options.meta).forEach(([key, value]) => {
                args.push("--meta", `${key}=${value}`);
            });
        }

        return VercelCLI.executeCommand(`list ${args.join(" ")}`, options);
    }

    /**
     * 環境変数を一覧表示
     */
    static envList(
        environment?: string,
        gitBranch?: string,
        options: VercelEnvOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        let command = "env ls";

        if (environment) command += ` ${environment}`;
        if (gitBranch) command += ` ${gitBranch}`;

        return VercelCLI.executeCommand(
            `${command} ${args.join(" ")}`,
            options
        );
    }

    /**
     * 環境変数を追加
     */
    static envAdd(options: VercelEnvOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(`env add ${args.join(" ")}`, options);
    }

    /**
     * 環境変数を削除
     */
    static envRemove(
        name: string,
        options: VercelEnvOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `env rm ${name} ${args.join(" ")}`,
            options
        );
    }

    /**
     * 環境変数をローカルに同期
     */
    static envPull(
        file?: string,
        options: VercelEnvOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.environment)
            args.push("--environment", options.environment);
        if (options.gitBranch) args.push("--git-branch", options.gitBranch);

        const command = file ? `env pull ${file}` : "env pull";
        return VercelCLI.executeCommand(
            `${command} ${args.join(" ")}`,
            options
        );
    }

    /**
     * ドメイン一覧を取得
     */
    static domainsList(options: VercelDomainOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.limit) args.push("--limit", options.limit.toString());

        return VercelCLI.executeCommand(
            `domains ls ${args.join(" ")}`,
            options
        );
    }

    /**
     * ドメインを追加
     */
    static domainsAdd(
        domain: string,
        options: VercelDomainOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `domains add ${domain} ${args.join(" ")}`,
            options
        );
    }

    /**
     * ドメインを削除
     */
    static domainsRemove(
        domain: string,
        options: VercelDomainOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `domains rm ${domain} ${args.join(" ")}`,
            options
        );
    }

    /**
     * プロジェクト一覧を取得
     */
    static projectList(
        options: VercelProjectOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.json) args.push("--json");
        if (options.updateRequired) args.push("--update-required");

        return VercelCLI.executeCommand(
            `project ls ${args.join(" ")}`,
            options
        );
    }

    /**
     * プロジェクトを追加
     */
    static projectAdd(
        name: string,
        options: VercelCommandOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `project add ${name} ${args.join(" ")}`,
            options
        );
    }

    /**
     * プロジェクトを削除
     */
    static projectRemove(
        name: string,
        options: VercelCommandOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `project rm ${name} ${args.join(" ")}`,
            options
        );
    }

    /**
     * ログを取得
     */
    static logs(
        deploymentUrl: string,
        options: VercelLogsOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.json) args.push("--json");
        if (options.follow) args.push("--follow");
        if (options.limit) args.push("--limit", options.limit.toString());
        if (options.output) args.push("--output", options.output);
        if (options.since) args.push("--since", options.since);
        if (options.until) args.push("--until", options.until);

        return VercelCLI.executeCommand(
            `logs ${deploymentUrl} ${args.join(" ")}`,
            options
        );
    }

    /**
     * プロジェクトをローカルディレクトリにリンク
     */
    static link(
        path?: string,
        options: VercelLinkOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.repo) args.push("--repo");
        if (options.project) args.push("--project", options.project);

        const command = path ? `link ${path}` : "link";
        return VercelCLI.executeCommand(
            `${command} ${args.join(" ")}`,
            options
        );
    }

    /**
     * 開発サーバーを起動
     */
    static dev(options: VercelDevOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.listen) args.push("--listen", options.listen);

        return VercelCLI.executeCommand(`dev ${args.join(" ")}`, options);
    }

    /**
     * プロジェクトをビルド
     */
    static build(options: VercelBuildOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.prod) args.push("--prod");
        if (options.target) args.push("--target", options.target);

        return VercelCLI.executeCommand(`build ${args.join(" ")}`, options);
    }

    /**
     * デプロイを昇格
     */
    static promote(
        deploymentUrl: string,
        options: VercelPromoteOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.timeout !== undefined) {
            args.push("--timeout", options.timeout.toString());
        }

        return VercelCLI.executeCommand(
            `promote ${deploymentUrl} ${args.join(" ")}`,
            options
        );
    }

    /**
     * デプロイまたはプロジェクトを削除
     */
    static remove(
        target: string,
        options: VercelRemoveOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.safe) args.push("--safe");

        return VercelCLI.executeCommand(
            `rm ${target} ${args.join(" ")}`,
            options
        );
    }

    /**
     * 本番エイリアスを過去デプロイにロールバック
     */
    static rollback(
        deploymentUrl: string,
        options: VercelRollbackOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);

        if (options.timeout !== undefined) {
            args.push("--timeout", options.timeout.toString());
        }

        return VercelCLI.executeCommand(
            `rollback ${deploymentUrl} ${args.join(" ")}`,
            options
        );
    }

    /**
     * デプロイを再実行
     */
    static redeploy(
        deploymentUrl: string,
        options: VercelCommandOptions = {}
    ): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(
            `redeploy ${deploymentUrl} ${args.join(" ")}`,
            options
        );
    }

    /**
     * 現在のユーザー/チーム情報を表示
     */
    static whoami(options: VercelCommandOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(`whoami ${args.join(" ")}`, options);
    }

    /**
     * ログイン
     */
    static login(options: VercelCommandOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(`login ${args.join(" ")}`, options);
    }

    /**
     * ログアウト
     */
    static logout(options: VercelCommandOptions = {}): VercelCommandResult {
        const args = VercelCLI.buildGlobalArgs(options);
        return VercelCLI.executeCommand(`logout ${args.join(" ")}`, options);
    }

    /**
     * 汎用コマンド実行（上記にないコマンド用）
     */
    static execute(
        command: string,
        options: VercelCommandOptions = {}
    ): VercelCommandResult {
        return VercelCLI.executeCommand(command, options);
    }
}

// EOF
