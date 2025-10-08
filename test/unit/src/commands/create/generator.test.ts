/**
 * プロジェクト生成機能のユニットテスト
 */
import fs from "node:fs";
import path from "node:path";

// i18nモジュールをモック
vi.mock("../../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            spinnerCreating: vi.fn((type: string, name: string) => `Creating ${type} project: ${name}`),
            spinnerSettingUp: vi.fn((type: string) => `Setting up ${type} project...`),
            spinnerInstallingDeps: "Installing dependencies...",
            spinnerConfiguringTemplate: vi.fn((template: string) => `Configuring ${template} template...`),
            spinnerSuccess: vi.fn((type: string, name: string) => `✅ Created ${type} project: ${name}`),
            spinnerFailure: "❌ Failed to create project",
            debugProjectConfig: "Project config:",
            debugGenerationSuccess: "Project generation completed",
            debugGenerationFailure: "Project generation failed:",
        },
    })),
}));
// fsモジュールをモック
vi.mock("node:fs", () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(),
        accessSync: vi.fn(),
        constants: {
            W_OK: 2,
        },
    },
}));
// debugモジュールをモック
vi.mock("../../../../../src/debug.js", () => ({
    debugLog: vi.fn(),
    isDevelopment: vi.fn(() => false),
}));
// oraモジュールをモック
vi.mock("ora", () => ({
    default: vi.fn(() => ({
        start: vi.fn(() => ({
            text: "",
            succeed: vi.fn(),
            fail: vi.fn(),
        })),
    })),
}));
// chalkモジュールをモック
vi.mock("chalk", () => ({
    default: {
        green: vi.fn((text: string) => text),
        red: vi.fn((text: string) => text),
        cyan: vi.fn((text: string) => text),
        yellow: vi.fn((text: string) => text),
    },
}));
// モノレポジェネレーターをモック
vi.mock("../../../../../src/utils/monorepo-generator/index.js", () => ({
    copyMonorepoTemplates: vi.fn(),
    createMonorepoStructure: vi.fn(),
    createWebAppPackageJson: vi.fn(),
}));
// README生成をモック
vi.mock("../../../../../src/utils/readme-generator/index.js", () => ({
    generateReadmeContent: vi.fn(() => "# Test Project\n\nTest README content"),
}));

import ora from "ora";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { generateProject } from "../../../../../src/commands/create/generator.js";
import type { ProjectConfig } from "../../../../../src/commands/create/types.js";
import { debugLog, isDevelopment } from "../../../../../src/debug.js";
import {
    copyMonorepoTemplates,
    createMonorepoStructure,
    createWebAppPackageJson,
} from "../../../../../src/utils/monorepo-generator/index.js";
import { generateReadmeContent } from "../../../../../src/utils/readme-generator/index.js";

describe("プロジェクト生成機能", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let mockSpinner: any;

    beforeEach(() => {
        // モックをリセット
        vi.clearAllMocks();

        // console.logをモック
        consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
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

        // debugモックのデフォルト動作
        vi.mocked(isDevelopment).mockReturnValue(false);
    });

    afterEach(() => {
        // スパイを復元
        consoleSpy.mockRestore();
    });

    describe("generateProject", () => {
        test("モノレポプロジェクトの場合、適切な構造で生成すること", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "test-monorepo",
                directory: "test-monorepo",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            await generateProject(config);

            // 検証: ディレクトリ作成が呼ばれること
            expect(fs.mkdirSync).toHaveBeenCalledWith(config.directory, {
                recursive: true,
            });

            // 検証: モノレポ関連の関数が呼ばれること
            expect(createMonorepoStructure).toHaveBeenCalledWith(config);
            expect(copyMonorepoTemplates).toHaveBeenCalledWith(config, undefined);
            expect(createWebAppPackageJson).toHaveBeenCalledWith(config);

            // 検証: README.mdが作成されること
            expect(generateReadmeContent).toHaveBeenCalledWith(config);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(config.directory, "README.md"),
                "# Test Project\n\nTest README content"
            );

            // 検証: スピナーが成功で終了すること
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });

        test("シンプルプロジェクトの場合、package.jsonとREADMEを作成すること", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "test-simple",
                directory: "test-simple",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: ディレクトリ作成が呼ばれること
            expect(fs.mkdirSync).toHaveBeenCalledWith(config.directory, {
                recursive: true,
            });

            // 検証: モノレポ関連の関数が呼ばれないこと
            expect(createMonorepoStructure).not.toHaveBeenCalled();
            expect(copyMonorepoTemplates).not.toHaveBeenCalled();
            expect(createWebAppPackageJson).not.toHaveBeenCalled();

            // 検証: package.jsonが作成されること
            const expectedPackageJson = {
                name: config.name,
                version: "0.1.0",
                description: `A ${config.type} project created with Fluorite Flake`,
                scripts: {
                    dev: "expo start",
                    build: "expo build",
                },
                dependencies: {},
                devDependencies: {},
            };

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(config.directory, "package.json"),
                JSON.stringify(expectedPackageJson, null, 2)
            );

            // 検証: README.mdが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(config.directory, "README.md"),
                "# Test Project\n\nTest README content"
            );

            // 検証: スピナーが成功で終了すること
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });

        test("既存のディレクトリが存在する場合、作成をスキップすること", async () => {
            // モックの設定: ディレクトリが既に存在
            vi.mocked(fs.existsSync).mockReturnValue(true);

            // テストデータ準備
            const config: ProjectConfig = {
                type: "tauri",
                name: "existing-project",
                directory: "existing-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: ディレクトリ作成が呼ばれないこと
            expect(fs.mkdirSync).not.toHaveBeenCalled();

            // 検証: その他の処理は正常に実行されること
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(mockSpinner.succeed).toHaveBeenCalled();
        });

        test("プロジェクトタイプに応じて適切なコマンドが設定されること", async () => {
            // nextjsプロジェクトのテスト
            const nextjsConfig: ProjectConfig = {
                type: "nextjs",
                name: "nextjs-project",
                directory: "nextjs-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            await generateProject(nextjsConfig);

            // package.jsonの内容を確認
            const nextjsCall = vi
                .mocked(fs.writeFileSync)
                .mock.calls.find((call) => call[0].toString().includes("package.json"));
            expect(nextjsCall).toBeDefined();

            const nextjsPackageJson = JSON.parse(nextjsCall?.[1] as string);
            expect(nextjsPackageJson.scripts.dev).toBe("next dev");
            expect(nextjsPackageJson.scripts.build).toBe("next build");

            // モックをリセットして次のテスト
            vi.clearAllMocks();
            vi.mocked(fs.existsSync).mockReturnValue(false);

            // tauriプロジェクトのテスト
            const tauriConfig: ProjectConfig = {
                type: "tauri",
                name: "tauri-project",
                directory: "tauri-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            await generateProject(tauriConfig);

            const tauriCall = vi
                .mocked(fs.writeFileSync)
                .mock.calls.find((call) => call[0].toString().includes("package.json"));
            expect(tauriCall).toBeDefined();

            const tauriPackageJson = JSON.parse(tauriCall?.[1] as string);
            expect(tauriPackageJson.scripts.dev).toBe("tauri dev");
            expect(tauriPackageJson.scripts.build).toBe("tauri build");
        });

        test("開発モードの場合、デバッグログが出力されること", async () => {
            // モックの設定: 開発モード
            vi.mocked(isDevelopment).mockReturnValue(true);

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "debug-project",
                directory: "debug-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: デバッグログが出力されること
            expect(debugLog).toHaveBeenCalledWith("Project config:", config);
            expect(debugLog).toHaveBeenCalledWith("Project generation completed");
        });

        test("エラーが発生した場合、適切にハンドリングされること", async () => {
            // モックの設定: fs.writeFileSyncがエラーを投げる
            const testError = new Error("File system error");
            vi.mocked(fs.writeFileSync).mockImplementation(() => {
                throw testError;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "error-project",
                directory: "error-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行と検証
            await expect(generateProject(config)).rejects.toThrow("File system error");

            // 検証: スピナーが失敗で終了すること
            expect(mockSpinner.fail).toHaveBeenCalled();
        });

        test("開発モードでエラーが発生した場合、デバッグログが出力されること", async () => {
            // モックの設定: 開発モードとエラー
            vi.mocked(isDevelopment).mockReturnValue(true);
            const testError = new Error("Test error");
            vi.mocked(fs.writeFileSync).mockImplementation(() => {
                throw testError;
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "debug-error-project",
                directory: "debug-error-project",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            try {
                await generateProject(config);
            } catch (error) {
                // エラーは期待される
            }

            // 検証: エラーデバッグログが出力されること
            expect(debugLog).toHaveBeenCalledWith("Project generation failed:", testError);
        });

        test("プロジェクトパスが正しく表示されること", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "path-test",
                directory: "path-test",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: プロジェクトパスが表示されること
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("📂 プロジェクトの場所:"));
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining(path.resolve(process.cwd(), config.directory))
            );
        });

        test("スピナーのテキストが適切に更新されること", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "spinner-test",
                directory: "spinner-test",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // スピナーテキストの変更を追跡するための配列
            const spinnerTexts: string[] = [];

            // スピナーのテキスト設定をインターセプトして記録
            Object.defineProperty(mockSpinner, "text", {
                set: (value: string) => {
                    spinnerTexts.push(value);
                },
                get: () => spinnerTexts.at(-1) || "",
            });

            // テスト実行
            await generateProject(config);

            // 検証: 期待されるテキストが順番に設定されたことを確認
            expect(spinnerTexts).toContain("Setting up expo project...");
            expect(spinnerTexts).toContain("Installing dependencies...");
            expect(spinnerTexts).toContain("Configuring typescript template...");
        });

        test("Next.jsプロジェクトで.gitignoreファイルが生成されること", async () => {
            // fsモジュールのモック設定
            const mockFs = vi.mocked(fs);

            // fs.readFileSyncのモック設定（テンプレートファイル読み込み用）
            mockFs.readFileSync.mockReturnValue("# Mock gitignore content\nnode_modules/\n.next/");
            mockFs.existsSync.mockReturnValue(true);

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "gitignore-test",
                directory: "gitignore-test",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: .gitignoreファイルが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(config.directory, ".gitignore"),
                expect.any(String)
            );
        });

        test("Next.js以外のプロジェクトでは.gitignoreファイルが生成されないこと", async () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "no-gitignore-test",
                directory: "no-gitignore-test",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: .gitignoreファイルが作成されないこと
            expect(fs.writeFileSync).not.toHaveBeenCalledWith(
                path.join(config.directory, ".gitignore"),
                expect.any(String)
            );
        });

        test(".gitignoreテンプレートが見つからない場合、フォールバックが使用されること", async () => {
            // fsモジュールのモック設定
            const mockFs = vi.mocked(fs);

            // fs.readFileSyncがエラーを投げるように設定
            mockFs.readFileSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("gitignore")) {
                    throw new Error("Template not found");
                }
                return "{}";
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "fallback-test",
                directory: "fallback-test",
                template: "typescript",
                force: false,
                monorepo: false,
            };

            // テスト実行
            await generateProject(config);

            // 検証: フォールバック.gitignoreが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join(config.directory, ".gitignore"),
                expect.stringContaining("# Dependencies\nnode_modules/")
            );
        });
    });
});

// EOF
