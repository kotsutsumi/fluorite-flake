/**
 * ワークスペース管理クラス
 */

import fs from "node:fs/promises";
import path from "node:path";
import type {
    AppInfo,
    PackageInfo,
    ScriptMap,
    WorkspaceConfig,
} from "./types.js";

/**
 * ワークスペース管理クラス
 */
export class WorkspaceManager {
    /**
     * ワークスペース自動検出
     */
    async detectWorkspaces(projectPath: string): Promise<WorkspaceConfig> {
        const apps = await this.scanDirectory(path.join(projectPath, "apps"));
        const packages = await this.scanDirectory(
            path.join(projectPath, "packages")
        );

        return {
            rootPath: projectPath,
            apps: await Promise.all(
                apps.map(async (appPath) => {
                    const packageJson = await this.readPackageJson(appPath);
                    return {
                        name: packageJson.name || path.basename(appPath),
                        type: this.detectAppType(appPath, packageJson),
                        path: appPath,
                        scripts: packageJson.scripts || {},
                        packageJson,
                    };
                })
            ),
            packages: await Promise.all(
                packages.map(async (pkgPath) => {
                    const packageJson = await this.readPackageJson(pkgPath);
                    return {
                        name: packageJson.name || path.basename(pkgPath),
                        type: this.detectPackageType(pkgPath, packageJson),
                        path: pkgPath,
                        exports: this.extractExports(packageJson),
                        packageJson,
                    };
                })
            ),
            workspaceFile: await this.findWorkspaceFile(projectPath),
        };
    }

    /**
     * スクリプト自動生成
     */
    generateRootScripts(workspace: WorkspaceConfig): ScriptMap {
        const scripts: ScriptMap = {};

        // アプリ別スクリプト生成
        for (const app of workspace.apps) {
            for (const [scriptName] of Object.entries(app.scripts)) {
                scripts[`${app.name}:${scriptName}`] = this.buildFilterCommand(
                    app.name,
                    scriptName
                );
            }
        }

        // 集約スクリプト生成
        this.generateAggregatedScripts(workspace, scripts);

        return scripts;
    }

    /**
     * 既存プロジェクトをワークスペース化
     */
    async convertToWorkspace(projectPath: string): Promise<WorkspaceConfig> {
        // 既存のpackage.jsonをバックアップ
        const originalPackageJson = await this.readPackageJson(projectPath);

        // appsディレクトリ作成
        const appsDir = path.join(projectPath, "apps");
        await fs.mkdir(appsDir, { recursive: true });

        // メインアプリをapps/webに移動
        const webAppDir = path.join(appsDir, "web");
        await this.moveToAppsDirectory(projectPath, webAppDir);

        // pnpm-workspace.yaml作成
        await this.createWorkspaceFile(projectPath);

        // ルートpackage.json更新
        await this.updateRootPackageJson(projectPath, originalPackageJson);

        return await this.detectWorkspaces(projectPath);
    }

    /**
     * ディレクトリスキャン
     */
    private async scanDirectory(dirPath: string): Promise<string[]> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const directories = entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => path.join(dirPath, entry.name));

            // package.jsonが存在するディレクトリのみ返す
            const validDirectories: string[] = [];
            for (const dir of directories) {
                try {
                    await fs.access(path.join(dir, "package.json"));
                    validDirectories.push(dir);
                } catch {
                    // package.jsonが存在しない場合はスキップ
                }
            }

            return validDirectories;
        } catch {
            return [];
        }
    }

    /**
     * package.json読み込み
     */
    private async readPackageJson(dirPath: string): Promise<any> {
        try {
            const packageJsonPath = path.join(dirPath, "package.json");
            const content = await fs.readFile(packageJsonPath, "utf-8");
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    /**
     * アプリタイプ検出
     */
    private detectAppType(_appPath: string, packageJson: any): AppInfo["type"] {
        // 依存関係から判断
        const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        if (dependencies.next) {
            return "nextjs";
        }
        if (dependencies.expo) {
            return "expo";
        }
        if (dependencies["@tauri-apps/cli"]) {
            return "tauri";
        }
        if (dependencies.fastify || dependencies.express) {
            return "backend";
        }

        // スクリプトから判断
        const scripts = packageJson.scripts || {};
        if (scripts.dev?.includes("next")) {
            return "nextjs";
        }
        if (scripts.start?.includes("expo")) {
            return "expo";
        }
        if (scripts.dev?.includes("tauri")) {
            return "tauri";
        }

        return "library";
    }

    /**
     * パッケージタイプ検出
     */
    private detectPackageType(
        _pkgPath: string,
        packageJson: any
    ): PackageInfo["type"] {
        const name = packageJson.name || "";

        if (name.includes("config")) {
            return "config";
        }
        if (name.includes("shared")) {
            return "shared";
        }

        return "library";
    }

    /**
     * エクスポート情報抽出
     */
    private extractExports(packageJson: any): Record<string, string> {
        const exports: Record<string, string> = {};

        if (packageJson.exports) {
            if (typeof packageJson.exports === "string") {
                exports["."] = packageJson.exports;
            } else {
                Object.assign(exports, packageJson.exports);
            }
        }

        if (packageJson.main) {
            exports["."] = packageJson.main;
        }

        return exports;
    }

    /**
     * ワークスペースファイル検索
     */
    private async findWorkspaceFile(projectPath: string): Promise<string> {
        const candidates = [
            "pnpm-workspace.yaml",
            "pnpm-workspace.yml",
            "package.json", // workspacesフィールドがある場合
        ];

        for (const candidate of candidates) {
            const filePath = path.join(projectPath, candidate);
            try {
                await fs.access(filePath);
                return filePath;
            } catch {
                // ファイルが存在しない場合は次をチェック
            }
        }

        return "";
    }

    /**
     * pnpm --filterコマンド生成
     */
    private buildFilterCommand(appName: string, scriptName: string): string {
        return `pnpm --filter ${this.quoteIfNeeded(appName)} run ${this.quoteIfNeeded(scriptName)}`;
    }

    /**
     * スクリプト名やアプリ名のクォート処理
     */
    private quoteIfNeeded(value: string): string {
        return /[\s"']/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    }

    /**
     * 集約スクリプト生成
     */
    private generateAggregatedScripts(
        workspace: WorkspaceConfig,
        scripts: ScriptMap
    ): void {
        // 開発サーバー全体起動
        const devApps = workspace.apps.filter(
            (app) => app.scripts.dev || app.scripts.start
        );
        if (devApps.length > 0) {
            const devCommands = devApps.map((app) => {
                const scriptName = app.scripts.dev ? "dev" : "start";
                return this.buildFilterCommand(app.name, scriptName);
            });
            scripts.dev = devCommands.join(" & ");
        }

        // 全体ビルド
        const buildApps = workspace.apps.filter((app) => app.scripts.build);
        if (buildApps.length > 0) {
            scripts["build:all"] = buildApps
                .map((app) => this.buildFilterCommand(app.name, "build"))
                .join(" && ");
        }

        // 全体テスト
        const testApps = workspace.apps.filter((app) => app.scripts.test);
        if (testApps.length > 0) {
            scripts["test:all"] = testApps
                .map((app) => this.buildFilterCommand(app.name, "test"))
                .join(" && ");
        }

        // 全体リント
        const lintApps = workspace.apps.filter((app) => app.scripts.lint);
        if (lintApps.length > 0) {
            scripts["lint:all"] = lintApps
                .map((app) => this.buildFilterCommand(app.name, "lint"))
                .join(" && ");
        }

        // 全体型チェック
        const typecheckApps = workspace.apps.filter(
            (app) => app.scripts.typecheck
        );
        if (typecheckApps.length > 0) {
            scripts["typecheck:all"] = typecheckApps
                .map((app) => this.buildFilterCommand(app.name, "typecheck"))
                .join(" && ");
        }
    }

    /**
     * アプリディレクトリへの移動
     */
    private async moveToAppsDirectory(
        projectPath: string,
        targetPath: string
    ): Promise<void> {
        await fs.mkdir(targetPath, { recursive: true });

        // 移動対象ファイル・ディレクトリ
        const itemsToMove = [
            "src",
            "public",
            "prisma",
            "scripts",
            "components",
            "lib",
            "styles",
            "pages",
            "app",
            "next.config.js",
            "next.config.mjs",
            "tailwind.config.js",
            "tsconfig.json",
            "README.md",
            ".env.example",
        ];

        for (const item of itemsToMove) {
            const sourcePath = path.join(projectPath, item);
            const targetItemPath = path.join(targetPath, item);

            try {
                await fs.access(sourcePath);
                await fs.rename(sourcePath, targetItemPath);
            } catch {
                // ファイルが存在しない場合はスキップ
            }
        }

        // package.jsonをコピー（移動ではなく）
        try {
            const packageJsonContent = await fs.readFile(
                path.join(projectPath, "package.json"),
                "utf-8"
            );
            await fs.writeFile(
                path.join(targetPath, "package.json"),
                packageJsonContent
            );
        } catch {
            // package.jsonが存在しない場合はスキップ
        }
    }

    /**
     * ワークスペースファイル作成
     */
    private async createWorkspaceFile(projectPath: string): Promise<void> {
        const workspaceConfig = `packages:
  - "apps/*"
  - "packages/*"
`;

        await fs.writeFile(
            path.join(projectPath, "pnpm-workspace.yaml"),
            workspaceConfig
        );
    }

    /**
     * ルートpackage.json更新
     */
    private async updateRootPackageJson(
        projectPath: string,
        originalPackageJson: any
    ): Promise<void> {
        const rootPackageJson = {
            name: originalPackageJson.name || "monorepo-root",
            version: originalPackageJson.version || "0.1.0",
            private: true,
            type: "module",
            scripts: {
                "install:all": "pnpm install",
                dev: "pnpm --filter web dev",
                "build:all": "pnpm --filter web build",
                "test:all": "pnpm --filter web test",
                "lint:all": "pnpm --filter web lint",
            },
            devDependencies: {
                tsx: "^4.20.6",
            },
            engines: {
                pnpm: ">=8.0.0",
                node: ">=20.0.0",
            },
        };

        await fs.writeFile(
            path.join(projectPath, "package.json"),
            JSON.stringify(rootPackageJson, null, 2)
        );
    }
}

// EOF
