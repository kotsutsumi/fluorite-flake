/**
 * パス解決システム
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { EnvFilePaths, ExecutionContext } from "./types.js";

/**
 * パス解決クラス
 */
export class PathResolver {
    /**
     * 実行コンテキスト検出
     */
    async detectExecutionContext(): Promise<ExecutionContext> {
        const cwd = process.cwd();

        // ワークスペースルートかチェック
        if (await this.isWorkspaceRoot(cwd)) {
            return {
                type: "monorepo-root",
                rootPath: cwd,
                currentApp: null,
            };
        }

        // アプリディレクトリ内かチェック
        if (cwd.includes("/apps/")) {
            const rootPath = await this.findMonorepoRoot(cwd);
            const currentApp = this.extractAppName(cwd);

            return {
                type: "app-directory",
                rootPath: rootPath || cwd,
                currentApp,
            };
        }

        // スタンドアロンプロジェクト
        return {
            type: "standalone",
            rootPath: cwd,
            currentApp: null,
        };
    }

    /**
     * 環境変数ファイル解決
     */
    resolveEnvFiles(context: ExecutionContext, appName: string): EnvFilePaths {
        const basePath =
            context.type === "monorepo-root"
                ? path.join(context.rootPath, "apps", appName)
                : context.rootPath;

        return {
            development: path.join(basePath, ".env.development"),
            staging: path.join(basePath, ".env.staging"),
            production: path.join(basePath, ".env.production"),
            local: path.join(basePath, ".env.local"),
        };
    }

    /**
     * スクリプトパス解決
     */
    resolveScriptPath(scriptPath: string, context: ExecutionContext): string {
        if (path.isAbsolute(scriptPath)) {
            return scriptPath;
        }

        const appRoot =
            context.type === "app-directory"
                ? context.rootPath
                : path.join(
                      context.rootPath,
                      "apps",
                      context.currentApp || "web"
                  );

        return path.resolve(appRoot, scriptPath);
    }

    /**
     * プロジェクトルート検索
     */
    async findProjectRoot(startPath: string = process.cwd()): Promise<string> {
        let currentPath = path.resolve(startPath);

        while (currentPath !== path.dirname(currentPath)) {
            // ワークスペースファイルをチェック
            const workspaceFiles = [
                "pnpm-workspace.yaml",
                "pnpm-workspace.yml",
            ];

            for (const workspaceFile of workspaceFiles) {
                try {
                    await fs.access(path.join(currentPath, workspaceFile));
                    return currentPath;
                } catch {
                    // ファイルが存在しない場合は次をチェック
                }
            }

            // package.jsonのworkspacesフィールドをチェック
            try {
                const packageJsonPath = path.join(currentPath, "package.json");
                const packageJsonContent = await fs.readFile(
                    packageJsonPath,
                    "utf-8"
                );
                const packageJson = JSON.parse(packageJsonContent);

                if (packageJson.workspaces) {
                    return currentPath;
                }
            } catch {
                // package.jsonが存在しないか無効な場合はスキップ
            }

            currentPath = path.dirname(currentPath);
        }

        // ワークスペースが見つからない場合は開始パスを返す
        return startPath;
    }

    // 最寄りのpackage.json検索（将来の機能拡張で使用予定）
    // private async findNearestPackageJson(startPath: string): Promise<any> {
    //     let currentPath = path.resolve(startPath);
    //
    //     while (currentPath !== path.dirname(currentPath)) {
    //         try {
    //             const packageJsonPath = path.join(currentPath, "package.json");
    //             const content = await fs.readFile(packageJsonPath, "utf-8");
    //             return JSON.parse(content);
    //         } catch {
    //             // package.jsonが存在しない場合は親ディレクトリを検索
    //         }
    //
    //         currentPath = path.dirname(currentPath);
    //     }
    //
    //     return {};
    // }

    /**
     * ワークスペースルート判定
     */
    private async isWorkspaceRoot(dirPath: string): Promise<boolean> {
        const workspaceFiles = ["pnpm-workspace.yaml", "pnpm-workspace.yml"];

        for (const workspaceFile of workspaceFiles) {
            try {
                await fs.access(path.join(dirPath, workspaceFile));
                return true;
            } catch {
                // ファイルが存在しない場合は次をチェック
            }
        }

        // package.jsonのworkspacesフィールドをチェック
        try {
            const packageJsonPath = path.join(dirPath, "package.json");
            const packageJsonContent = await fs.readFile(
                packageJsonPath,
                "utf-8"
            );
            const packageJson = JSON.parse(packageJsonContent);

            return !!packageJson.workspaces;
        } catch {
            return false;
        }
    }

    /**
     * モノレポルート検索
     */
    private async findMonorepoRoot(startPath: string): Promise<string | null> {
        let currentPath = path.resolve(startPath);

        while (currentPath !== path.dirname(currentPath)) {
            if (await this.isWorkspaceRoot(currentPath)) {
                return currentPath;
            }

            currentPath = path.dirname(currentPath);
        }

        return null;
    }

    /**
     * アプリ名抽出
     */
    private extractAppName(appPath: string): string {
        const segments = appPath.split(path.sep);
        const appsIndex = segments.indexOf("apps");

        if (appsIndex !== -1 && appsIndex + 1 < segments.length) {
            return segments[appsIndex + 1];
        }

        return path.basename(appPath);
    }
}

// EOF
