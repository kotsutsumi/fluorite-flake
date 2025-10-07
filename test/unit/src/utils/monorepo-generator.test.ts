/**
 * モノレポ生成機能のユニットテスト
 */
import fs from "node:fs";
import path from "node:path";

// fsモジュールをモック
vi.mock("node:fs", () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        copyFileSync: vi.fn(),
    },
}));

import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProjectConfig } from "../../../../src/commands/create/types.js";
import {
    copyMonorepoTemplates,
    createMonorepoStructure,
    createWebAppPackageJson,
} from "../../../../src/utils/monorepo-generator/index.js";

describe("モノレポ生成機能", () => {
    beforeEach(() => {
        // モックをリセット
        vi.clearAllMocks();

        // fsモックのデフォルト動作
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.mkdirSync).mockImplementation(() => {
            // モック関数：ディレクトリ作成のシミュレーション
        });
        vi.mocked(fs.readFileSync).mockReturnValue(
            "mock template content {{PROJECT_NAME}}"
        );
        vi.mocked(fs.writeFileSync).mockImplementation(() => {
            // モック関数：ファイル書き込みのシミュレーション
        });
        vi.mocked(fs.copyFileSync).mockImplementation(() => {
            // モック関数：ファイルコピーのシミュレーション
        });
    });

    describe("createMonorepoStructure", () => {
        test("適切なディレクトリ構造が作成されること", () => {
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
            createMonorepoStructure(config);

            // 検証: 必要なディレクトリが作成されること
            expect(fs.mkdirSync).toHaveBeenCalledWith("test-monorepo", {
                recursive: true,
            });
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("test-monorepo", "apps"),
                { recursive: true }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("test-monorepo", "packages"),
                { recursive: true }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("test-monorepo", "apps", "web"),
                { recursive: true }
            );

            // 検証: mkdirSyncが4回呼ばれること（4つのディレクトリ）
            expect(fs.mkdirSync).toHaveBeenCalledTimes(4);
        });

        test("既存のディレクトリが存在する場合、作成をスキップすること", () => {
            // モックの設定: 全てのディレクトリが既に存在
            vi.mocked(fs.existsSync).mockReturnValue(true);

            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "existing-monorepo",
                directory: "existing-monorepo",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createMonorepoStructure(config);

            // 検証: ディレクトリ作成が呼ばれないこと
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });

        test("一部のディレクトリのみ既存の場合、必要な分だけ作成すること", () => {
            // モックの設定: 特定のディレクトリのみ存在
            vi.mocked(fs.existsSync).mockImplementation((dirPath) => {
                const pathStr = dirPath.toString();
                // test-partialとtest-partial/appsディレクトリのみ存在
                return (
                    pathStr === "test-partial" ||
                    pathStr === path.join("test-partial", "apps")
                );
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "tauri",
                name: "test-partial",
                directory: "test-partial",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createMonorepoStructure(config);

            // 検証: 存在しないディレクトリのみ作成されること（作成順序に従って）
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("test-partial", "packages"),
                { recursive: true }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("test-partial", "apps", "web"),
                { recursive: true }
            );

            // 検証: 存在するディレクトリは作成されないこと
            expect(fs.mkdirSync).not.toHaveBeenCalledWith("test-partial", {
                recursive: true,
            });
            expect(fs.mkdirSync).not.toHaveBeenCalledWith(
                path.join("test-partial", "apps"),
                { recursive: true }
            );

            // 検証: 正確に2回呼ばれること（packages と apps/web）
            expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
        });
    });

    describe("copyMonorepoTemplates", () => {
        beforeEach(() => {
            // テンプレートファイルが存在するようにモック
            vi.mocked(fs.existsSync).mockReturnValue(true);
        });

        test("テンプレートファイルが適切にコピーされること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "template-test",
                directory: "template-test",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            copyMonorepoTemplates(config);

            // 検証: package.json.templateが読み込まれること
            expect(fs.readFileSync).toHaveBeenCalledWith(
                expect.stringContaining("package.json.template"),
                "utf-8"
            );

            // 検証: プロジェクト名が置換されてpackage.jsonが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join("template-test", "package.json"),
                "mock template content template-test", // {{PROJECT_NAME}}が置換される
                "utf-8"
            );

            // 検証: その他のファイルがコピーされること
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining("pnpm-workspace.yaml"),
                path.join("template-test", "pnpm-workspace.yaml")
            );
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining("turbo.json"),
                path.join("template-test", "turbo.json")
            );
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining("biome.json.template"),
                path.join("template-test", "biome.json")
            );
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining("tsconfig.base.json"),
                path.join("template-test", "tsconfig.base.json")
            );
        });

        test("存在しないテンプレートファイルはスキップされること", () => {
            // モックの設定: 一部のファイルのみ存在
            vi.mocked(fs.existsSync).mockImplementation((filePath) => {
                const pathStr = filePath.toString();
                return (
                    pathStr.includes("package.json.template") ||
                    pathStr.includes("turbo.json")
                );
            });

            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "missing-files-test",
                directory: "missing-files-test",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            copyMonorepoTemplates(config);

            // 検証: 存在するファイルのみコピーされること
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringContaining("turbo.json"),
                path.join("missing-files-test", "turbo.json")
            );

            // 検証: copyFileSync呼び出し数が限定されること（存在するファイルのみ）
            expect(fs.copyFileSync).toHaveBeenCalledTimes(1); // turbo.jsonのみ
        });

        test("プロジェクト名の置換が正しく動作すること", () => {
            // モックの設定: 複数のプレースホルダーを含むテンプレート
            vi.mocked(fs.readFileSync).mockReturnValue(
                'name: "{{PROJECT_NAME}}", description: "{{PROJECT_NAME}} monorepo"'
            );

            // テストデータ準備
            const config: ProjectConfig = {
                type: "tauri",
                name: "replacement-test",
                directory: "replacement-test",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            copyMonorepoTemplates(config);

            // 検証: 全てのプレースホルダーが置換されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join("replacement-test", "package.json"),
                'name: "replacement-test", description: "replacement-test monorepo"',
                "utf-8"
            );
        });
    });

    describe("createWebAppPackageJson", () => {
        test("nextjsプロジェクトの場合、適切なpackage.jsonが作成されること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "nextjs-app",
                directory: "nextjs-app",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createWebAppPackageJson(config);

            // 検証: 正しいパスにファイルが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join("nextjs-app", "apps", "web", "package.json"),
                expect.any(String),
                "utf-8"
            );

            // 検証: package.jsonの内容が正しいこと
            const writtenContent = vi.mocked(fs.writeFileSync).mock
                .calls[0][1] as string;
            const packageJson = JSON.parse(writtenContent);

            expect(packageJson.name).toBe("nextjs-app-web");
            expect(packageJson.scripts.dev).toBe("next dev");
            expect(packageJson.scripts.build).toBe("next build");
            expect(packageJson.dependencies.next).toBeDefined();
            expect(packageJson.dependencies.react).toBeDefined();
            expect(packageJson.devDependencies.typescript).toBeDefined();
        });

        test("expoプロジェクトの場合、適切なpackage.jsonが作成されること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "expo",
                name: "expo-app",
                directory: "expo-app",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createWebAppPackageJson(config);

            // 検証: package.jsonの内容が正しいこと
            const writtenContent = vi.mocked(fs.writeFileSync).mock
                .calls[0][1] as string;
            const packageJson = JSON.parse(writtenContent);

            expect(packageJson.name).toBe("expo-app-mobile");
            expect(packageJson.main).toBe("expo-router/entry");
            expect(packageJson.scripts.start).toBe("expo start");
            expect(packageJson.scripts.android).toBe("expo run:android");
            expect(packageJson.dependencies.expo).toBeDefined();
            expect(packageJson.dependencies["expo-router"]).toBeDefined();
        });

        test("tauriプロジェクトの場合、適切なpackage.jsonが作成されること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "tauri",
                name: "tauri-app",
                directory: "tauri-app",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createWebAppPackageJson(config);

            // 検証: package.jsonの内容が正しいこと
            const writtenContent = vi.mocked(fs.writeFileSync).mock
                .calls[0][1] as string;
            const packageJson = JSON.parse(writtenContent);

            expect(packageJson.name).toBe("tauri-app-desktop");
            expect(packageJson.type).toBe("module");
            expect(packageJson.scripts.dev).toBe("vite");
            expect(packageJson.scripts.tauri).toBe("tauri");
            expect(packageJson.dependencies["@tauri-apps/api"]).toBeDefined();
            expect(
                packageJson.devDependencies["@tauri-apps/cli"]
            ).toBeDefined();
        });

        test("サポートされていないプロジェクトタイプの場合、エラーが投げられること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "unsupported" as any,
                name: "error-test",
                directory: "error-test",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行と検証
            expect(() => createWebAppPackageJson(config)).toThrow(
                "Unsupported project type: unsupported"
            );

            // 検証: ファイルが作成されないこと
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        test("全プロジェクトタイプで共通のスクリプトが含まれること", () => {
            const projectTypes: Array<"nextjs" | "expo" | "tauri"> = [
                "nextjs",
                "expo",
                "tauri",
            ];

            for (const type of projectTypes) {
                // モックをリセット
                vi.clearAllMocks();

                // テストデータ準備
                const config: ProjectConfig = {
                    type,
                    name: `${type}-common-test`,
                    directory: `${type}-common-test`,
                    template: "typescript",
                    force: false,
                    monorepo: true,
                };

                // テスト実行
                createWebAppPackageJson(config);

                // 検証: 共通スクリプトが含まれること
                const writtenContent = vi.mocked(fs.writeFileSync).mock
                    .calls[0][1] as string;
                const packageJson = JSON.parse(writtenContent);

                expect(packageJson.scripts.lint).toBe("ultracite check");
                expect(packageJson.scripts.typecheck).toBe("tsc --noEmit");
                expect(packageJson.devDependencies.typescript).toBeDefined();
            }
        });

        test("プロジェクト名がpackage名に正しく反映されること", () => {
            // テストデータ準備: 特殊文字を含むプロジェクト名
            const config: ProjectConfig = {
                type: "nextjs",
                name: "my-awesome-project_2024",
                directory: "my-awesome-project_2024",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // テスト実行
            createWebAppPackageJson(config);

            // 検証: プロジェクト名が正しく使用されること
            const writtenContent = vi.mocked(fs.writeFileSync).mock
                .calls[0][1] as string;
            const packageJson = JSON.parse(writtenContent);

            expect(packageJson.name).toBe("my-awesome-project_2024-web");
        });
    });

    describe("統合テスト", () => {
        test("全ての関数を順番に実行した場合、完全なモノレポ構造が作成されること", () => {
            // テストデータ準備
            const config: ProjectConfig = {
                type: "nextjs",
                name: "integration-test",
                directory: "integration-test",
                template: "typescript",
                force: false,
                monorepo: true,
            };

            // モックの設定
            vi.mocked(fs.existsSync).mockImplementation((filePath) => {
                const pathStr = filePath.toString();
                // テンプレートファイルは存在するが、ディレクトリは存在しない
                return (
                    pathStr.includes("templates") ||
                    pathStr.includes(".template") ||
                    pathStr.includes("turbo.json")
                );
            });

            // テスト実行: 全ての関数を順番に実行
            createMonorepoStructure(config);
            copyMonorepoTemplates(config);
            createWebAppPackageJson(config);

            // 検証: ディレクトリ構造が作成されること
            expect(fs.mkdirSync).toHaveBeenCalledWith("integration-test", {
                recursive: true,
            });
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("integration-test", "apps"),
                { recursive: true }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("integration-test", "packages"),
                { recursive: true }
            );
            expect(fs.mkdirSync).toHaveBeenCalledWith(
                path.join("integration-test", "apps", "web"),
                { recursive: true }
            );

            // 検証: テンプレートファイルがコピーされること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join("integration-test", "package.json"),
                expect.any(String),
                "utf-8"
            );

            // 検証: Webアプリのpackage.jsonが作成されること
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                path.join("integration-test", "apps", "web", "package.json"),
                expect.any(String),
                "utf-8"
            );

            // 検証: 適切な回数の操作が実行されること
            expect(fs.mkdirSync).toHaveBeenCalledTimes(4); // 4つのディレクトリ
            expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // ルートとWebアプリのpackage.json
        });
    });
});

// EOF
