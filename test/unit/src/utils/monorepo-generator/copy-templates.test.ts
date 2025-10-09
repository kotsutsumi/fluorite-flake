/**
 * copyMonorepoTemplatesのユニットテスト
 *
 * このテストファイルでは、モノレポテンプレートのコピー機能をテストします。
 * 特に、動的なpnpmバージョン置換機能の動作を検証します。
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectConfig } from "../../../../../src/commands/create/types.js";
import { copyMonorepoTemplates } from "../../../../../src/utils/monorepo-generator/copy-templates.js";

// fsモジュールのモック
vi.mock("node:fs", () => ({
    default: {
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        readdirSync: vi.fn(),
        copyFileSync: vi.fn(),
    },
}));

// pathモジュールのモック（部分的）
vi.mock("node:path", async () => {
    const actual = await vi.importActual("node:path");
    return {
        ...actual,
        default: {
            ...actual.default,
            dirname: vi.fn(),
            resolve: vi.fn(),
            join: vi.fn(),
        },
        dirname: vi.fn(),
        resolve: vi.fn(),
        join: vi.fn(),
    };
});

// テスト用のプロジェクト設定
const createTestConfig = (overrides?: Partial<ProjectConfig>): ProjectConfig => ({
    type: "nextjs",
    name: "test-project",
    directory: "/test/project",
    template: "default",
    force: false,
    monorepo: true,
    ...overrides,
});

// テンプレートファイルの内容
const mockTemplateContent = `{
\t"name": "{{PROJECT_NAME}}-workspace",
\t"private": true,
\t"packageManager": "pnpm@{{PNPM_VERSION}}",
\t"workspaces": ["apps/*", "packages/*"],
\t"scripts": {
\t\t"dev": "turbo run dev --filter={{PROJECT_NAME}}-web",
\t\t"build": "turbo run build"
\t},
\t"engines": {
\t\t"node": ">=20.0.0",
\t\t"pnpm": ">={{PNPM_MAJOR_VERSION}}"
\t}
}`;

describe("copyMonorepoTemplates関数", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // デフォルトのモック設定
        const mockFs = vi.mocked(fs);
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue([
            "package.json.template",
            "turbo.json.template",
            ".gitignore.template",
        ] as any);
        mockFs.readFileSync.mockReturnValue(mockTemplateContent);

        const mockPath = vi.mocked(path);
        mockPath.dirname.mockReturnValue("/templates/monorepo");
        mockPath.resolve.mockReturnValue("/templates/monorepo");
        mockPath.join.mockImplementation((...args) => args.join("/"));
    });

    describe("基本的なテンプレートコピー機能", () => {
        it("pnpmVersionが指定されている場合、正しくプレースホルダーを置換する", () => {
            // モック設定
            const config = createTestConfig();
            const pnpmVersion = "10.15.2";

            // 実行
            copyMonorepoTemplates(config, pnpmVersion);

            // 検証: 両方の内容が含まれることを確認
            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            expect(writeCall[0]).toBe("/test/project/package.json");
            expect(writeCall[1]).toContain('"packageManager": "pnpm@10.15.2"');
            expect(writeCall[1]).toContain('"pnpm": ">=10"');
            expect(writeCall[2]).toBe("utf-8");
        });

        it("pnpmVersionが未指定の場合、latestとバージョン10を使用する", () => {
            // モック設定
            const config = createTestConfig();

            // 実行
            copyMonorepoTemplates(config);

            // 検証: 両方の内容が含まれることを確認
            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            expect(writeCall[0]).toBe("/test/project/package.json");
            expect(writeCall[1]).toContain('"packageManager": "pnpm@latest"');
            expect(writeCall[1]).toContain('"pnpm": ">=10"');
            expect(writeCall[2]).toBe("utf-8");
        });

        it("プロジェクト名のプレースホルダーを正しく置換する", () => {
            // モック設定
            const config = createTestConfig({ name: "my-awesome-project" });
            const pnpmVersion = "10.18.1";

            // 実行
            copyMonorepoTemplates(config, pnpmVersion);

            // 検証: 両方の内容が含まれることを確認
            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            expect(writeCall[0]).toBe("/test/project/package.json");
            expect(writeCall[1]).toContain('"name": "my-awesome-project-workspace"');
            expect(writeCall[1]).toContain('"dev": "turbo run dev --filter=my-awesome-project-web"');
            expect(writeCall[2]).toBe("utf-8");
        });
    });

    describe("バージョンフォーマットの処理", () => {
        it("プレリリースバージョンを正しく処理する", () => {
            const testCases = [
                { input: "11.0.0-beta.1", expectedMajor: "11" },
                { input: "10.18.1-next.2", expectedMajor: "10" },
                { input: "12.1.0-alpha.3", expectedMajor: "12" },
            ];

            for (const testCase of testCases) {
                // モック設定
                const config = createTestConfig();

                // 実行
                copyMonorepoTemplates(config, testCase.input);

                // 検証: 両方の内容が含まれることを確認
                const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
                expect(writeCall[0]).toBe("/test/project/package.json");
                expect(writeCall[1]).toContain(`"packageManager": "pnpm@${testCase.input}"`);
                expect(writeCall[1]).toContain(`"pnpm": ">=${testCase.expectedMajor}"`);
                expect(writeCall[2]).toBe("utf-8");

                // モッククリア（次のテストケース用）
                vi.clearAllMocks();
                const mockFs = vi.mocked(fs);
                const mockPath = vi.mocked(path);
                mockFs.existsSync.mockReturnValue(true);
                mockFs.readdirSync.mockReturnValue(["package.json.template"] as any);
                mockFs.readFileSync.mockReturnValue(mockTemplateContent);
                mockPath.dirname.mockReturnValue("/templates/monorepo");
                mockPath.resolve.mockReturnValue("/templates/monorepo");
                mockPath.join.mockImplementation((...args) => args.join("/"));
            }
        });

        it("不正なバージョン文字列の場合、デフォルトバージョンを使用する", () => {
            // モック設定
            const config = createTestConfig();
            const invalidVersion = "invalid-version";

            // 実行
            copyMonorepoTemplates(config, invalidVersion);

            // 検証: 不正なバージョンの場合、元の文字列はそのまま使用されるがメジャーバージョンは10になる
            const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
            expect(writeCall[0]).toBe("/test/project/package.json");
            expect(writeCall[1]).toContain('"packageManager": "pnpm@invalid-version"');
            expect(writeCall[1]).toContain('"pnpm": ">=10"');
            expect(writeCall[2]).toBe("utf-8");
        });
    });

    describe("ファイルシステム操作", () => {
        it("ターゲットディレクトリが存在しない場合でも正常に処理される", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            // package.json.templateは存在するが、ターゲットディレクトリは存在しないと仮定
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string" && filePath.includes("package.json.template")) {
                    return true;
                }
                return false;
            });

            // 実行（エラーが発生しないことを確認）
            expect(() => {
                copyMonorepoTemplates(config, "10.18.1");
            }).not.toThrow();

            // 検証: writeFileSyncが呼ばれる（ディレクトリは自動作成される）
            expect(fs.writeFileSync).toHaveBeenCalledWith("/test/project/package.json", expect.any(String), "utf-8");
        });

        it("複数のテンプレートファイルを処理する", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            // package.json.templateと各種ファイルが存在することをモック
            mockFs.existsSync.mockImplementation((filePath) => {
                if (typeof filePath === "string") {
                    // 実装で確認されるファイルのみ true を返す
                    return (
                        filePath.includes("package.json.template") ||
                        filePath.includes("pnpm-workspace.yaml") ||
                        filePath.includes("turbo.json") ||
                        filePath.includes("biome.json.template") ||
                        filePath.includes("tsconfig.base.json") ||
                        filePath.includes("gitignore")
                    );
                }
                return false;
            });

            // 実行
            copyMonorepoTemplates(config, "10.18.1");

            // 検証: package.jsonのwriteFileSyncが1回、その他はcopyFileSyncで処理
            expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
            expect(fs.writeFileSync).toHaveBeenCalledWith("/test/project/package.json", expect.any(String), "utf-8");

            // copyFileSyncが複数回呼ばれることを確認
            expect(fs.copyFileSync).toHaveBeenCalled();
        });

        it("package.json.templateが存在しない場合はエラーをスロー", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error("ENOENT: no such file or directory");
            });

            // 実行・検証
            expect(() => {
                copyMonorepoTemplates(config, "10.18.1");
            }).toThrow("ENOENT: no such file or directory");
        });
    });

    describe("エラーハンドリング", () => {
        it("ファイル読み取りエラーを適切に処理する", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error("File read error");
            });

            // 実行・検証
            expect(() => {
                copyMonorepoTemplates(config, "10.18.1");
            }).toThrow("File read error");
        });

        it("ファイル書き込みエラーを適切に処理する", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            mockFs.writeFileSync.mockImplementation(() => {
                throw new Error("File write error");
            });

            // 実行・検証
            expect(() => {
                copyMonorepoTemplates(config, "10.18.1");
            }).toThrow("File write error");
        });
    });

    describe("プレースホルダー置換の詳細テスト", () => {
        it("全てのプレースホルダーが正しく置換される", () => {
            // モック設定
            const config = createTestConfig({ name: "test-app" });
            const pnpmVersion = "11.2.0";
            const templateWithAllPlaceholders = `{
\t"name": "{{PROJECT_NAME}}-workspace",
\t"packageManager": "pnpm@{{PNPM_VERSION}}",
\t"scripts": {
\t\t"dev": "turbo run dev --filter={{PROJECT_NAME}}-web"
\t},
\t"engines": {
\t\t"pnpm": ">={{PNPM_MAJOR_VERSION}}"
\t}
}`;
            const mockFs = vi.mocked(fs);
            // モッククリア（エラーハンドリングテストの影響を除去）
            vi.clearAllMocks();
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(templateWithAllPlaceholders);
            mockFs.writeFileSync.mockImplementation(() => {
                // 正常動作をモック
            });

            // 実行
            copyMonorepoTemplates(config, pnpmVersion);

            // 検証
            const expectedContent = `{
\t"name": "test-app-workspace",
\t"packageManager": "pnpm@11.2.0",
\t"scripts": {
\t\t"dev": "turbo run dev --filter=test-app-web"
\t},
\t"engines": {
\t\t"pnpm": ">=11"
\t}
}`;
            expect(fs.writeFileSync).toHaveBeenCalledWith("/test/project/package.json", expectedContent, "utf-8");
        });

        it("プレースホルダーが存在しない場合も正常に処理する", () => {
            // モック設定
            const config = createTestConfig();
            const simpleTemplate = '{"name": "simple-template"}';
            const mockFs = vi.mocked(fs);
            // モッククリア（エラーハンドリングテストの影響を除去）
            vi.clearAllMocks();
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue(simpleTemplate);
            mockFs.writeFileSync.mockImplementation(() => {
                // 正常動作をモック
            });

            // 実行
            copyMonorepoTemplates(config, "10.18.1");

            // 検証
            expect(fs.writeFileSync).toHaveBeenCalledWith("/test/project/package.json", simpleTemplate, "utf-8");
        });
    });

    describe(".gitignore ファイルの処理", () => {
        it("モノレポ用.gitignoreファイルが正しくコピーされること", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            // モッククリア（エラーハンドリングテストの影響を除去）
            vi.clearAllMocks();
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readFileSync.mockReturnValue("{}");
            mockFs.writeFileSync.mockImplementation(() => {
                // 正常動作をモック
            });
            mockFs.copyFileSync.mockImplementation(() => {
                // 正常動作をモック
            });

            // 実行
            copyMonorepoTemplates(config, "10.18.1");

            // 検証: shared/monorepoから.gitignoreがコピーされること
            expect(fs.copyFileSync).toHaveBeenCalledWith(
                expect.stringMatching(/templates\/shared\/monorepo\/gitignore$/),
                "/test/project/.gitignore"
            );
        });

        it("shared/monorepoテンプレートが存在しない場合、エラーにならないこと", () => {
            // モック設定
            const config = createTestConfig();
            const mockFs = vi.mocked(fs);
            mockFs.existsSync.mockImplementation((filePath) => {
                // package.json.templateは存在する
                if (typeof filePath === "string" && filePath.includes("package.json.template")) {
                    return true;
                }
                // shared/monorepo/gitignoreは存在しない
                if (typeof filePath === "string" && filePath.includes("shared/monorepo/gitignore")) {
                    return false;
                }
                return true;
            });
            mockFs.readFileSync.mockReturnValue("{}");

            // 実行（エラーが発生しないことを確認）
            expect(() => {
                copyMonorepoTemplates(config, "10.18.1");
            }).not.toThrow();

            // 検証: copyFileSyncが呼ばれないこと
            expect(fs.copyFileSync).not.toHaveBeenCalledWith(expect.stringMatching(/gitignore$/), expect.any(String));
        });
    });
});

// EOF
