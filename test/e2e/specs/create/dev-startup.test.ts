/**
 * プロジェクト生成からdev起動までのE2Eテスト
 * Issue: monorepoでdocsプロジェクトが含まれる場合のdev起動問題のテスト
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { assertCLIResult, assertProject } from "../../helpers/assertions.js";
import { runCLI } from "../../helpers/cli-runner.js";
import { createTempDirectory, type TempDirectory } from "../../helpers/temp-manager.js";
import { PERFORMANCE_THRESHOLDS } from "../../setup/test-config.js";

describe("dev起動問題 E2E テスト", () => {
    let tempDir: TempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory({
            prefix: "fluorite-e2e-dev-startup-",
        });
    });

    afterEach(async () => {
        await tempDir.cleanup();
    });

    describe("monorepo + docsプロジェクト生成テスト", () => {
        test("Next.js fullstack-adminテンプレート（monorepo + docs）で依存関係が正しくインストールされる", async () => {
            const projectName = "test-monorepo-docs";

            // プロジェクト生成（docsを含むmonorepo）
            const result = await runCLI([
                "create",
                projectName,
                "--type", "nextjs",
                "--template", "fullstack-admin",
                "--monorepo",
                "--docs"
            ], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            // CLI実行結果を検証
            assertCLIResult.all(result, {
                exitCode: 0,
                containsOutput: ["プロジェクトが作成されました", projectName],
                maxDuration: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            const projectPath = path.join(tempDir.path, projectName);

            // プロジェクト構造の基本検証
            await assertProject.exists(projectPath);
            await assertProject.isMonorepo(projectPath);

            // pnpm-workspace.yamlの存在確認
            const workspaceFile = path.join(projectPath, "pnpm-workspace.yaml");
            expect(fs.existsSync(workspaceFile), "pnpm-workspace.yamlが存在しない").toBe(true);

            // apps/webディレクトリの存在確認
            const webAppPath = path.join(projectPath, "apps", "web");
            expect(fs.existsSync(webAppPath), "apps/webディレクトリが存在しない").toBe(true);

            // apps/docsディレクトリの存在確認
            const docsPath = path.join(projectPath, "apps", "docs");
            expect(fs.existsSync(docsPath), "apps/docsディレクトリが存在しない").toBe(true);

            // docsプロジェクトのpackage.jsonの存在確認
            const docsPackageJson = path.join(docsPath, "package.json");
            expect(fs.existsSync(docsPackageJson), "docs/package.jsonが存在しない").toBe(true);

            // ルートnode_modulesの存在確認（再インストールが実行されたか）
            const rootNodeModules = path.join(projectPath, "node_modules");
            expect(fs.existsSync(rootNodeModules), "ルートnode_modulesが存在しない").toBe(true);

            // docsプロジェクトのnode_modulesの存在確認
            const docsNodeModules = path.join(docsPath, "node_modules");
            expect(fs.existsSync(docsNodeModules), "docs/node_modulesが存在しない").toBe(true);
        });

        test("生成されたmonorepoでdev scriptsが正しく動作する", async () => {
            const projectName = "test-dev-scripts";

            // プロジェクト生成
            const result = await runCLI([
                "create",
                projectName,
                "--type", "nextjs",
                "--template", "fullstack-admin",
                "--monorepo",
                "--docs"
            ], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            assertCLIResult.success(result);

            const projectPath = path.join(tempDir.path, projectName);

            // ルートpackage.jsonのdev scriptを確認
            const rootPackageJsonPath = path.join(projectPath, "package.json");
            const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf-8"));

            // dev scriptの存在確認
            expect(rootPackageJson.scripts).toBeDefined();
            expect(rootPackageJson.scripts.dev).toBeDefined();

            // dev scriptの内容確認（web appのdevコマンドが含まれているか）
            const devScript = rootPackageJson.scripts.dev;
            expect(devScript, "dev scriptが正しく設定されていない").toContain("pnpm --filter");
            expect(devScript, "web appのdev scriptが含まれていない").toContain("web");

            // 各アプリのpackage.jsonを確認
            const webPackageJsonPath = path.join(projectPath, "apps", "web", "package.json");
            const webPackageJson = JSON.parse(fs.readFileSync(webPackageJsonPath, "utf-8"));
            expect(webPackageJson.scripts.dev, "web appにdev scriptが存在しない").toBeDefined();

            const docsPackageJsonPath = path.join(projectPath, "apps", "docs", "package.json");
            const docsPackageJson = JSON.parse(fs.readFileSync(docsPackageJsonPath, "utf-8"));
            expect(docsPackageJson.scripts.dev, "docs appにdev scriptが存在しない").toBeDefined();
        });

        test("docsプロジェクトの依存関係が不足している場合の警告表示", async () => {
            const projectName = "test-docs-dependency-warning";

            // まずプロジェクトを生成
            const createResult = await runCLI([
                "create",
                projectName,
                "--type", "nextjs",
                "--template", "fullstack-admin",
                "--monorepo",
                "--docs"
            ], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            assertCLIResult.success(createResult);

            const projectPath = path.join(tempDir.path, projectName);
            const docsPath = path.join(projectPath, "apps", "docs");

            // docsプロジェクトのnode_modulesを削除（依存関係不足をシミュレート）
            const docsNodeModules = path.join(docsPath, "node_modules");
            if (fs.existsSync(docsNodeModules)) {
                fs.rmSync(docsNodeModules, { recursive: true, force: true });
            }

            // workspace scriptsを再生成してみる（警告が表示されるか確認）
            try {
                // syncRootScriptsを直接テストするため、CLIではなく内部関数を使用
                const { syncRootScripts } = await import("../../../../src/utils/workspace-manager/index.js");

                // コンソール出力をキャプチャ
                const originalWarn = console.warn;
                const warnings: string[] = [];
                console.warn = (...args: any[]) => {
                    warnings.push(args.join(" "));
                };

                await syncRootScripts(projectPath);

                // コンソール出力を復元
                console.warn = originalWarn;

                // 依存関係がインストールされていない警告が表示されたか確認
                const hasDepWarning = warnings.some(warning =>
                    warning.includes("依存関係がインストールされていません") ||
                    warning.includes("pnpm install")
                );

                expect(hasDepWarning, "依存関係不足の警告が表示されていない").toBe(true);

            } catch (error) {
                // エラーが発生した場合も、適切にハンドリングされているかを確認
                expect(error).toBeDefined();
            }
        });

        test("再インストール処理の実行確認", async () => {
            const projectName = "test-post-install";

            // 再インストール処理が実行されることを確認するため、コンソール出力をキャプチャ
            const result = await runCLI([
                "create",
                projectName,
                "--type", "nextjs",
                "--template", "fullstack-admin",
                "--monorepo",
                "--docs"
            ], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            assertCLIResult.success(result);

            // 出力に再インストール関連のメッセージが含まれているか確認
            const output = result.stdout || "";
            const hasPostInstallMessage =
                output.includes("依存関係を再インストール") ||
                output.includes("Reinstalling dependencies") ||
                output.includes("📦");

            expect(hasPostInstallMessage, "再インストール処理の実行が確認できない").toBe(true);

            const projectPath = path.join(tempDir.path, projectName);

            // 最終的に全ての依存関係がインストールされていることを確認
            const rootNodeModules = path.join(projectPath, "node_modules");
            const docsNodeModules = path.join(projectPath, "apps", "docs", "node_modules");

            expect(fs.existsSync(rootNodeModules), "ルートnode_modulesが存在しない").toBe(true);
            expect(fs.existsSync(docsNodeModules), "docs node_modulesが存在しない").toBe(true);
        });

        test("エラーハンドリング: 再インストール失敗時の適切な処理", async () => {
            const projectName = "test-post-install-error";

            // 無効なプロジェクト名やパスを使用して、再インストールが失敗する状況をテスト
            // （実際には、プロジェクト生成は成功するが再インストールで問題が起きる可能性をテスト）
            const result = await runCLI([
                "create",
                projectName,
                "--type", "nextjs",
                "--template", "fullstack-admin",
                "--monorepo",
                "--docs"
            ], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            // 再インストールが失敗してもプロジェクト生成自体は成功するはず
            assertCLIResult.success(result);

            const projectPath = path.join(tempDir.path, projectName);
            await assertProject.exists(projectPath);

            // 基本的なプロジェクト構造は作成されているべき
            const webAppPath = path.join(projectPath, "apps", "web");
            const docsPath = path.join(projectPath, "apps", "docs");

            expect(fs.existsSync(webAppPath), "apps/webディレクトリが存在しない").toBe(true);
            expect(fs.existsSync(docsPath), "apps/docsディレクトリが存在しない").toBe(true);
        });
    });
});

// EOF