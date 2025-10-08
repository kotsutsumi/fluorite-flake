/**
 * プロジェクト生成機能の monorepo 再インストール機能のユニットテスト
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test, vi, beforeEach } from "vitest";

// モジュールをモック
vi.mock("node:child_process", () => ({
    execSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(),
        accessSync: vi.fn(),
        rmSync: vi.fn(),
        constants: {
            W_OK: 2,
        },
    },
}));

vi.mock("../../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            spinnerCreating: vi.fn((type: string, name: string) => `Creating ${type} project: ${name}`),
            spinnerSettingUp: vi.fn((type: string) => `Setting up ${type} project...`),
            spinnerInstallingDeps: "Installing dependencies...",
            spinnerConfiguringTemplate: vi.fn((template: string) => `Configuring ${template} template...`),
            spinnerPostInstalling: "📦 Reinstalling dependencies...",
            spinnerSuccess: vi.fn((type: string, name: string) => `✅ Created ${type} project: ${name}`),
            spinnerFailure: "❌ Failed to create project",
            postInstallFailed: "⚠️ Failed to reinstall dependencies. Please run `pnpm install` manually.",
            postInstallSkipped: "ℹ️ Skipped dependency reinstallation",
            debugProjectConfig: "Project config:",
            debugGenerationSuccess: "Project generation completed",
            debugGenerationFailure: "Project generation failed:",
        },
    })),
}));

vi.mock("../../../../../src/debug.js", () => ({
    debugLog: vi.fn(),
    isDevelopment: vi.fn(() => false),
}));

vi.mock("ora", () => ({
    default: vi.fn(() => ({
        start: vi.fn(() => ({
            text: "",
            succeed: vi.fn(),
            fail: vi.fn(),
        })),
    })),
}));

vi.mock("chalk", () => ({
    default: {
        green: vi.fn((text: string) => text),
        red: vi.fn((text: string) => text),
        cyan: vi.fn((text: string) => text),
        yellow: vi.fn((text: string) => text),
        gray: vi.fn((text: string) => text),
    },
}));

// ユーティリティモジュールをモック
vi.mock("../../../../../src/utils/monorepo-generator/index.js", () => ({
    copyMonorepoTemplates: vi.fn(),
    createMonorepoStructure: vi.fn(),
    createWebAppPackageJson: vi.fn(),
}));

vi.mock("../../../../../src/utils/docs-generator/index.js", () => ({
    copyDocsTemplate: vi.fn().mockResolvedValue(true),
    createDocsPackageJson: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../../../../src/utils/readme-generator/index.js", () => ({
    generateReadmeContent: vi.fn(() => "# Test Project\n\nTest README content"),
}));

vi.mock("../../../../../src/utils/workspace-manager/index.js", () => ({
    syncRootScripts: vi.fn(),
}));

import chalk from "chalk";
import ora from "ora";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { generateProject } from "../../../../../src/commands/create/generator.js";
import type { ProjectConfig } from "../../../../../src/commands/create/types.js";
import { debugLog, isDevelopment } from "../../../../../src/debug.js";

describe("プロジェクト生成機能 - monorepo 再インストール", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let mockSpinner: any;

    beforeEach(() => {
        // モックをリセット
        vi.clearAllMocks();

        // console スパイの設定
        consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
            // モック関数：何もしない
        });
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // モック関数：何もしない
        });

        // スピナーモックの設定
        mockSpinner = {
            text: "",
            succeed: vi.fn(),
            fail: vi.fn(),
        };

        const mockOra = {
            start: vi.fn(() => mockSpinner),
        };

        vi.mocked(ora).mockReturnValue(mockOra);

        // fsモックのデフォルト動作
        const mockFs = vi.mocked(fs);
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => {
            // モック関数：ディレクトリ作成のシミュレーション
        });
        mockFs.writeFileSync.mockImplementation(() => {
            // モック関数：ファイル書き込みのシミュレーション
        });
        mockFs.readFileSync.mockReturnValue("mock file content");
        mockFs.accessSync.mockImplementation(() => {
            // モック関数：権限チェックが成功（例外を投げない）
        });
        mockFs.rmSync.mockImplementation(() => {
            // モック関数：ファイル削除のシミュレーション
        });

        // execSyncモックのデフォルト動作
        vi.mocked(execSync).mockReturnValue("");

        // debugモックのデフォルト動作
        vi.mocked(isDevelopment).mockReturnValue(false);
    });

    afterEach(() => {
        // スパイを復元
        consoleSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    describe("shouldPostInstall 判定ロジック", () => {
        test("monorepoがfalseの場合、falseを返すこと", async () => {
            // テストデータ準備 - monorepoではないプロジェクト
            const config: ProjectConfig = {
                type: "nextjs",
                name: "simple-project",
                directory: "simple-project",
                template: "typescript",
                force: false,
                monorepo: false,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: execSyncが呼ばれないこと（再インストールが実行されない）
            expect(execSync).not.toHaveBeenCalled();
        });

        test("shouldGenerateDocsがfalseの場合、falseを返すこと", async () => {
            // テストデータ準備 - docsを生成しないmonorepoプロジェクト
            const config: ProjectConfig = {
                type: "nextjs",
                name: "monorepo-no-docs",
                directory: "monorepo-no-docs",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: execSyncが呼ばれないこと（再インストールが実行されない）
            expect(execSync).not.toHaveBeenCalled();
        });

        test("docsディレクトリが存在しない場合、falseを返すこと", async () => {
            // モックの設定: docsディレクトリが存在しない
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("apps/docs")) {
                    return false;
                }
                return false;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "monorepo-no-docs-dir",
                directory: "monorepo-no-docs-dir",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: execSyncが呼ばれないこと（再インストールが実行されない）
            expect(execSync).not.toHaveBeenCalled();
        });

        test("全ての条件が満たされた場合、trueを返すこと（再インストールが実行される）", async () => {
            // モックの設定: 完全なプロジェクト構造が存在する
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string") {
                    // プロジェクトディレクトリ、package.json、pnpm-workspace.yaml、docsディレクトリが存在
                    if (filePath.includes("monorepo-with-docs") ||
                        filePath.includes("package.json") ||
                        filePath.includes("pnpm-workspace.yaml") ||
                        filePath.includes("apps/docs")) {
                        return true;
                    }
                }
                return false;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "monorepo-with-docs",
                directory: "monorepo-with-docs",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: execSyncが呼ばれること（再インストールが実行される）
            expect(execSync).toHaveBeenCalledWith("pnpm install", {
                cwd: config.directory,
                stdio: "pipe",
                timeout: 120000,
            });
        });
    });

    describe("executePostInstall 実行ロジック", () => {
        test("正常にpnpm installが実行されること", async () => {
            // モックの設定: 完全なプロジェクト構造が存在する
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string") {
                    // プロジェクトディレクトリ、package.json、pnpm-workspace.yaml、docsディレクトリが存在
                    if (filePath.includes("install-success") ||
                        filePath.includes("package.json") ||
                        filePath.includes("pnpm-workspace.yaml") ||
                        filePath.includes("apps/docs")) {
                        return true;
                    }
                }
                return false;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "install-success",
                directory: "install-success",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: pnpm installが正しいパラメータで実行されること
            expect(execSync).toHaveBeenCalledWith("pnpm install", {
                cwd: config.directory,
                stdio: "pipe",
                timeout: 120000,
            });

            // 検証: デバッグログが出力されること
            expect(debugLog).toHaveBeenCalledWith("Starting post-install for monorepo", {
                projectPath: config.directory,
            });
            expect(debugLog).toHaveBeenCalledWith("Post-install completed successfully");
        });

        test("開発モードの場合、stdio: inheritが設定されること", async () => {
            // モックの設定: 開発モードと完全なプロジェクト構造
            vi.mocked(isDevelopment).mockReturnValue(true);
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string") {
                    // プロジェクトディレクトリ、package.json、pnpm-workspace.yaml、docsディレクトリが存在
                    if (filePath.includes("dev-mode-install") ||
                        filePath.includes("package.json") ||
                        filePath.includes("pnpm-workspace.yaml") ||
                        filePath.includes("apps/docs")) {
                        return true;
                    }
                }
                return false;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "dev-mode-install",
                directory: "dev-mode-install",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: inheritモードでpnpm installが実行されること
            expect(execSync).toHaveBeenCalledWith("pnpm install", {
                cwd: config.directory,
                stdio: "inherit",
                timeout: 120000,
            });
        });

        test("エラーが発生した場合、適切にハンドリングされること", async () => {
            // モックの設定: docsディレクトリが存在し、execSyncがエラーを投げる
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("apps/docs")) {
                    return true;
                }
                return false;
            });

            const testError = new Error("pnpm install failed");
            vi.mocked(execSync).mockImplementation(() => {
                throw testError;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "install-error",
                directory: "install-error",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: エラーログが出力されること
            expect(debugLog).toHaveBeenCalledWith("Post-install failed", { error: testError });

            // 検証: 警告メッセージが表示されること
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                chalk.yellow("⚠️ Failed to reinstall dependencies. Please run `pnpm install` manually.")
            );

            // 検証: プロジェクト生成自体は成功すること（エラーで中断されない）
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });

        test("開発モードでエラーが発生した場合、詳細なエラー情報が表示されること", async () => {
            // モックの設定: 開発モード、docsディレクトリ存在、execSyncエラー
            vi.mocked(isDevelopment).mockReturnValue(true);
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("apps/docs")) {
                    return true;
                }
                return false;
            });

            const testError = new Error("Detailed error message");
            vi.mocked(execSync).mockImplementation(() => {
                throw testError;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "dev-error",
                directory: "dev-error",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: 警告メッセージが表示されること
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                chalk.yellow("⚠️ Failed to reinstall dependencies. Please run `pnpm install` manually.")
            );

            // 検証: 詳細なエラー情報が表示されること
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                chalk.gray(`詳細: ${testError}`)
            );
        });
    });

    describe("スピナーメッセージ", () => {
        test("再インストール中に適切なスピナーメッセージが表示されること", async () => {
            // モックの設定: docsディレクトリが存在する
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("apps/docs")) {
                    return true;
                }
                return false;
            });

            // スピナーテキストの変更を追跡
            const spinnerTexts: string[] = [];
            Object.defineProperty(mockSpinner, "text", {
                set: (value: string) => {
                    spinnerTexts.push(value);
                },
                get: () => spinnerTexts.at(-1) || "",
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "spinner-test",
                directory: "spinner-test",
                template: "typescript",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: 再インストールのスピナーメッセージが表示されること
            expect(spinnerTexts).toContain("📦 Reinstalling dependencies...");
        });
    });

    describe("プロジェクト生成統合テスト", () => {
        test("フルスタックテンプレートでdocsが生成される場合、再インストールが実行されること", async () => {
            // モックの設定: 完全なプロジェクト構造が存在する
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string") {
                    // プロジェクトディレクトリ、package.json、pnpm-workspace.yaml、docsディレクトリが存在
                    if (filePath.includes("fullstack-docs") ||
                        filePath.includes("package.json") ||
                        filePath.includes("pnpm-workspace.yaml") ||
                        filePath.includes("apps/docs")) {
                        return true;
                    }
                }
                return false;
            });

            // テストデータ準備（データベース設定を追加）
            const config: ProjectConfig = {
                type: "nextjs",
                name: "fullstack-docs",
                directory: "fullstack-docs",
                template: "fullstack-admin",
                force: false,
                monorepo: true,
                shouldGenerateDocs: true,
                databaseConfig: {
                    type: "sqlite",
                    sqlite: {
                        path: "./data/sqlite.db",
                    },
                },
            };

            // テスト実行
            await generateProject(config);

            // 検証: syncRootScriptsの後にpnpm installが実行されること
            expect(execSync).toHaveBeenCalledWith("pnpm install", {
                cwd: config.directory,
                stdio: "pipe",
                timeout: 120000,
            });

            // 検証: プロジェクト生成が成功すること
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });

        test("非monorepoプロジェクトでは再インストールが実行されないこと", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "simple-project",
                directory: "simple-project",
                template: "typescript",
                force: false,
                monorepo: false,
                shouldGenerateDocs: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: pnpm installが実行されないこと
            expect(execSync).not.toHaveBeenCalled();

            // 検証: プロジェクト生成が成功すること
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });
    });
});

// EOF