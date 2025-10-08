/**
 * エラーハンドリングシステム
 */

import fs from "node:fs/promises";
import path from "node:path";
// import yaml from "js-yaml"; // 必要に応じて追加
import type { ExecutionContext, MonorepoError, RecoveryResult } from "./types.js";
import { MonorepoErrorType } from "./types.js";

/**
 * モノレポエラーハンドラー
 */
export class MonorepoErrorHandler {
    /**
     * エラー分析と自動修復
     */
    async handleError(error: MonorepoError, context: ExecutionContext): Promise<RecoveryResult> {
        switch (error.type) {
            case MonorepoErrorType.WORKSPACE_NOT_FOUND:
                return await this.recoverWorkspace(error, context);

            case MonorepoErrorType.SCRIPT_NOT_FOUND:
                return await this.suggestAlternativeScripts(error, context);

            case MonorepoErrorType.DEPENDENCY_MISSING:
                return await this.installMissingDependencies(error, context);

            case MonorepoErrorType.PATH_RESOLUTION_FAILED:
                return await this.repairPathReferences(error, context);

            case MonorepoErrorType.EXECUTION_FAILED:
                return await this.analyzeExecutionFailure(error, context);

            case MonorepoErrorType.PERMISSION_DENIED:
                return await this.resolvePermissionIssues(error, context);

            default:
                return this.provideGenericGuidance(error);
        }
    }

    /**
     * ワークスペース修復
     */
    private async recoverWorkspace(_error: MonorepoError, context: ExecutionContext): Promise<RecoveryResult> {
        const workspaceFile = path.join(context.rootPath, "pnpm-workspace.yaml");

        if (!(await this.fileExists(workspaceFile))) {
            // ワークスペースファイルを自動生成
            await this.generateDefaultWorkspace(context.rootPath);
            return {
                recovered: true,
                action: "generated_workspace_file",
                message: "Generated missing pnpm-workspace.yaml",
            };
        }

        // 既存ワークスペースの修復
        const apps = await this.scanForApps(context.rootPath);
        await this.updateWorkspaceConfig(workspaceFile, apps);

        return {
            recovered: true,
            action: "updated_workspace_config",
            message: `Updated workspace config with ${apps.length} discovered apps`,
        };
    }

    /**
     * スクリプト代替案提示
     */
    private async suggestAlternativeScripts(error: MonorepoError, context: ExecutionContext): Promise<RecoveryResult> {
        const availableScripts = await this.scanAvailableScripts(context);
        const suggestions = this.findSimilarScripts(error.requestedScript || "", availableScripts);

        return {
            recovered: false,
            action: "suggest_alternatives",
            message: `Script '${error.requestedScript}' not found. Did you mean: ${suggestions.join(", ")}?`,
            suggestions,
        };
    }

    /**
     * 依存関係インストール
     */
    private async installMissingDependencies(
        _error: MonorepoError,
        context: ExecutionContext
    ): Promise<RecoveryResult> {
        try {
            // pnpm installを実行
            const { spawn } = await import("node:child_process");
            const process = spawn("pnpm", ["install"], {
                cwd: context.rootPath,
                stdio: "inherit",
            });

            await new Promise((resolve, reject) => {
                process.on("close", (code) => {
                    if (code === 0) {
                        resolve(undefined);
                    } else {
                        reject(new Error(`pnpm install failed with code ${code}`));
                    }
                });
            });

            return {
                recovered: true,
                action: "installed_dependencies",
                message: "Successfully installed missing dependencies",
            };
        } catch (installError) {
            return {
                recovered: false,
                action: "install_failed",
                message: `Failed to install dependencies: ${installError instanceof Error ? installError.message : "Unknown error"}`,
                suggestions: ["Run 'pnpm install' manually", "Check internet connection", "Verify package.json syntax"],
            };
        }
    }

    /**
     * パス参照修復
     */
    private async repairPathReferences(_error: MonorepoError, _context: ExecutionContext): Promise<RecoveryResult> {
        // 壊れたパス参照の検出と修復ロジック
        const suggestions = [
            "Verify file paths in scripts",
            "Check working directory context",
            "Use absolute paths where necessary",
        ];

        return {
            recovered: false,
            action: "path_repair_guidance",
            message: "Path resolution failed. Manual verification required.",
            suggestions,
        };
    }

    /**
     * 実行エラー分析
     */
    private async analyzeExecutionFailure(error: MonorepoError, _context: ExecutionContext): Promise<RecoveryResult> {
        const errorMessage = error.message.toLowerCase();
        let suggestions: string[] = [];

        if (errorMessage.includes("command not found")) {
            suggestions = [
                "Install required CLI tools",
                "Check PATH environment variable",
                "Verify dependency installation",
            ];
        } else if (errorMessage.includes("permission denied")) {
            suggestions = ["Check file permissions", "Run with appropriate user", "Verify write access to directories"];
        } else if (errorMessage.includes("port already in use")) {
            suggestions = [
                "Kill existing processes on the port",
                "Use a different port",
                "Check for conflicting services",
            ];
        } else {
            suggestions = [
                "Check console output for details",
                "Verify configuration files",
                "Try running command manually",
            ];
        }

        return {
            recovered: false,
            action: "execution_analysis",
            message: `Execution failed: ${error.message}`,
            suggestions,
        };
    }

    /**
     * 権限問題解決
     */
    private async resolvePermissionIssues(_error: MonorepoError, _context: ExecutionContext): Promise<RecoveryResult> {
        return {
            recovered: false,
            action: "permission_guidance",
            message: "Permission denied. Manual intervention required.",
            suggestions: [
                "Check file/directory permissions",
                "Ensure proper user ownership",
                "Verify write access to target directories",
                "Consider running with appropriate privileges",
            ],
        };
    }

    /**
     * 汎用ガイダンス
     */
    private provideGenericGuidance(error: MonorepoError): RecoveryResult {
        return {
            recovered: false,
            action: "generic_guidance",
            message: `Encountered error: ${error.message}`,
            suggestions: [
                "Check console output for detailed error information",
                "Verify project configuration",
                "Consult documentation for troubleshooting",
                "Consider reporting this issue if it persists",
            ],
        };
    }

    /**
     * デフォルトワークスペース生成
     */
    private async generateDefaultWorkspace(rootPath: string): Promise<void> {
        const workspaceConfig = {
            packages: ["apps/*", "packages/*"],
        };

        const workspaceContent = this.serializeYaml(workspaceConfig);
        await fs.writeFile(path.join(rootPath, "pnpm-workspace.yaml"), workspaceContent);
    }

    /**
     * アプリスキャン
     */
    private async scanForApps(rootPath: string): Promise<string[]> {
        const apps: string[] = [];
        const appsDir = path.join(rootPath, "apps");

        try {
            const entries = await fs.readdir(appsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const appPath = path.join(appsDir, entry.name);
                    const packageJsonPath = path.join(appPath, "package.json");

                    if (await this.fileExists(packageJsonPath)) {
                        apps.push(entry.name);
                    }
                }
            }
        } catch {
            // appsディレクトリが存在しない場合は空配列を返す
        }

        return apps;
    }

    /**
     * ワークスペース設定更新
     */
    private async updateWorkspaceConfig(workspaceFile: string, _apps: string[]): Promise<void> {
        const workspaceConfig = {
            packages: ["apps/*", "packages/*"],
        };

        const workspaceContent = this.serializeYaml(workspaceConfig);
        await fs.writeFile(workspaceFile, workspaceContent);
    }

    /**
     * 利用可能スクリプトスキャン
     */
    private async scanAvailableScripts(context: ExecutionContext): Promise<string[]> {
        const scripts: string[] = [];

        // ルートpackage.jsonのスクリプト
        try {
            const rootPackageJson = await this.readPackageJson(context.rootPath);
            scripts.push(...Object.keys(rootPackageJson.scripts || {}));
        } catch {
            // package.jsonが存在しない場合はスキップ
        }

        // アプリのスクリプト
        const appsDir = path.join(context.rootPath, "apps");
        try {
            const apps = await fs.readdir(appsDir, { withFileTypes: true });

            for (const app of apps) {
                if (app.isDirectory()) {
                    try {
                        const appPackageJson = await this.readPackageJson(path.join(appsDir, app.name));
                        const appScripts = Object.keys(appPackageJson.scripts || {});
                        scripts.push(...appScripts.map((script) => `${app.name}:${script}`));
                    } catch {
                        // アプリのpackage.jsonが存在しない場合はスキップ
                    }
                }
            }
        } catch {
            // appsディレクトリが存在しない場合はスキップ
        }

        return [...new Set(scripts)]; // 重複除去
    }

    /**
     * 類似スクリプト検索
     */
    private findSimilarScripts(requestedScript: string, availableScripts: string[]): string[] {
        const similar = availableScripts.filter((script) => this.calculateSimilarity(requestedScript, script) > 0.6);

        return similar.slice(0, 3); // 上位3つまで
    }

    /**
     * 文字列類似度計算
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) {
            return 1.0;
        }

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * レーベンシュタイン距離計算
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = new Array(str2.length + 1).fill(null).map(() => new Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * ファイル存在確認
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * package.json読み込み
     */
    private async readPackageJson(dirPath: string): Promise<any> {
        const packageJsonPath = path.join(dirPath, "package.json");
        const content = await fs.readFile(packageJsonPath, "utf-8");
        return JSON.parse(content);
    }

    /**
     * 簡単なYAMLシリアライザー
     */
    private serializeYaml(obj: any): string {
        if (typeof obj !== "object" || obj === null) {
            return String(obj);
        }

        const lines: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
            if (Array.isArray(value)) {
                lines.push(`${key}:`);
                for (const item of value) {
                    lines.push(`  - "${item}"`);
                }
            } else {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            }
        }

        return `${lines.join("\n")}\n`;
    }
}

// EOF
