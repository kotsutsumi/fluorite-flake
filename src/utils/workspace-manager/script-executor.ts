/**
 * スクリプト実行エンジン
 */

import { spawn } from "node:child_process";
import type {
    AggregatedResult,
    ExecutionFilter,
    ExecutionResult,
    WorkspaceConfig,
} from "./types.js";

/**
 * スクリプト実行クラス
 */
export class ScriptExecutor {
    private readonly workspace: WorkspaceConfig;

    constructor(workspace: WorkspaceConfig) {
        this.workspace = workspace;
    }

    /**
     * 条件付き実行
     */
    async executeConditional(
        command: string,
        filters: ExecutionFilter[]
    ): Promise<ExecutionResult[]> {
        const targets = await this.resolveTargets(filters);

        const executions = targets.map((target) =>
            this.executeSingle(target, command)
        );

        const results = await Promise.allSettled(executions);

        return results.map((result, index) => {
            if (result.status === "fulfilled") {
                return result.value;
            }
            return {
                app: targets[index],
                command,
                exitCode: 1,
                success: false,
                stderr: result.reason?.message || "Unknown error",
            };
        });
    }

    /**
     * 並列実行とログ管理
     */
    async executeParallel(
        commands: Array<{ app: string; command: string }>
    ): Promise<AggregatedResult> {
        const startTime = Date.now();

        const executions = commands.map(({ app, command }) =>
            this.executeWithLogging(app, command)
        );

        const results = await Promise.allSettled(executions);

        const executionResults: ExecutionResult[] = results.map(
            (result, index) => {
                if (result.status === "fulfilled") {
                    return result.value;
                }
                return {
                    app: commands[index].app,
                    command: commands[index].command,
                    exitCode: 1,
                    success: false,
                    stderr: result.reason?.message || "Unknown error",
                };
            }
        );

        return this.aggregateResults(executionResults, Date.now() - startTime);
    }

    /**
     * 単一アプリでの実行
     */
    private async executeSingle(
        appName: string,
        command: string
    ): Promise<ExecutionResult> {
        const app = this.workspace.apps.find((a) => a.name === appName);
        if (!app) {
            return {
                app: appName,
                command,
                exitCode: 1,
                success: false,
                stderr: `App '${appName}' not found in workspace`,
            };
        }

        // スクリプトの存在確認
        const scriptExists = Object.keys(app.scripts).includes(command);
        if (!scriptExists) {
            return {
                app: appName,
                command,
                exitCode: 1,
                success: false,
                stderr: `Script '${command}' not found in app '${appName}'`,
            };
        }

        return await this.executeWithLogging(appName, command);
    }

    /**
     * ログストリーミング付き実行
     */
    private executeWithLogging(
        app: string,
        command: string
    ): Promise<ExecutionResult> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            const process = spawn(
                "pnpm",
                ["--filter", app, ...command.split(" ")],
                {
                    cwd: this.workspace.rootPath,
                    stdio: "pipe",
                }
            );

            let stdout = "";
            let stderr = "";

            process.stdout?.on("data", (data) => {
                const output = data.toString();
                stdout += output;
                console.log(`[${app}] ${output.trimEnd()}`);
            });

            process.stderr?.on("data", (data) => {
                const output = data.toString();
                stderr += output;
                console.error(`[${app}] ${output.trimEnd()}`);
            });

            process.on("close", (code) => {
                const duration = Date.now() - startTime;
                resolve({
                    app,
                    command,
                    exitCode: code || 0,
                    success: (code || 0) === 0,
                    stdout,
                    stderr,
                    duration,
                });
            });

            process.on("error", (error) => {
                const duration = Date.now() - startTime;
                resolve({
                    app,
                    command,
                    exitCode: 1,
                    success: false,
                    stderr: error.message,
                    duration,
                });
            });
        });
    }

    /**
     * フィルターによるターゲット解決
     */
    private async resolveTargets(
        filters: ExecutionFilter[]
    ): Promise<string[]> {
        let targets = this.workspace.apps.map((app) => app.name);

        for (const filter of filters) {
            switch (filter.type) {
                case "app-name":
                    if (Array.isArray(filter.value)) {
                        targets = targets.filter((name) =>
                            filter.value.includes(name)
                        );
                    } else {
                        targets = targets.filter(
                            (name) => name === filter.value
                        );
                    }
                    break;

                case "app-type": {
                    const appTypes = Array.isArray(filter.value)
                        ? filter.value
                        : [filter.value];
                    targets = targets.filter((name) => {
                        const app = this.workspace.apps.find(
                            (a) => a.name === name
                        );
                        return app && appTypes.includes(app.type);
                    });
                    break;
                }

                case "script-exists": {
                    const scriptName = Array.isArray(filter.value)
                        ? filter.value[0]
                        : filter.value;
                    targets = targets.filter((name) => {
                        const app = this.workspace.apps.find(
                            (a) => a.name === name
                        );
                        return (
                            app && Object.keys(app.scripts).includes(scriptName)
                        );
                    });
                    break;
                }

                case "changed-files":
                    // Git差分ベースのフィルタリング（簡易実装）
                    // 実際の実装では git diff を使用
                    break;

                default:
                    // 未知のフィルタータイプは無視
                    break;
            }
        }

        return targets;
    }

    /**
     * 結果集約
     */
    private aggregateResults(
        results: ExecutionResult[],
        totalDuration: number
    ): AggregatedResult {
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.length - successCount;

        return {
            success: failureCount === 0,
            successCount,
            failureCount,
            results,
            totalDuration,
        };
    }
}

// EOF
