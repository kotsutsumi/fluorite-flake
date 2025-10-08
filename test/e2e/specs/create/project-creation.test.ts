/**
 * プロジェクト生成E2Eテスト
 */
import { afterEach, beforeEach, describe, test } from "vitest";

import { assertCLIResult, assertProject } from "../../helpers/assertions.js";
import { runCLI } from "../../helpers/cli-runner.js";
import { createTempDirectory, type TempDirectory } from "../../helpers/temp-manager.js";
import { PERFORMANCE_THRESHOLDS, PROJECT_TYPES, shouldSkipTest } from "../../setup/test-config.js";

describe("プロジェクト生成 E2E テスト", () => {
    let tempDir: TempDirectory;

    beforeEach(async () => {
        tempDir = await createTempDirectory({
            prefix: "fluorite-e2e-create-",
        });
    });

    afterEach(async () => {
        await tempDir.cleanup();
    });

    describe("Next.js プロジェクト生成", () => {
        test("TypeScript Next.js プロジェクトが正常に生成される", async () => {
            const projectName = "test-nextjs-ts";
            const result = await runCLI(["create", projectName, "--type", "nextjs", "--typescript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS,
            });

            // CLI実行結果を検証
            assertCLIResult.all(result, {
                exitCode: 0,
                containsOutput: ["プロジェクトが作成されました", projectName],
                maxDuration: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS,
            });

            // プロジェクト構造を検証
            const projectPath = `${tempDir.path}/${projectName}`;
            await assertProject.exists(projectPath);
            await assertProject.isType(projectPath, "nextjs");
            await assertProject.hasTypeScript(projectPath, true);
            await assertProject.hasFiles(projectPath, PROJECT_TYPES.NEXTJS.expectedFiles);
            await assertProject.hasDependencies(projectPath, PROJECT_TYPES.NEXTJS.expectedDependencies);
        });

        test("JavaScript Next.js プロジェクトが正常に生成される", async () => {
            const projectName = "test-nextjs-js";
            const result = await runCLI(["create", projectName, "--type", "nextjs", "--javascript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS,
            });

            assertCLIResult.success(result);

            const projectPath = `${tempDir.path}/${projectName}`;
            await assertProject.exists(projectPath);
            await assertProject.isType(projectPath, "nextjs");
            await assertProject.hasTypeScript(projectPath, false);
        });

        test("既存ディレクトリが存在する場合のエラーハンドリング", async () => {
            const projectName = "existing-project";
            const projectPath = `${tempDir.path}/${projectName}`;

            // 既存ディレクトリを作成
            await createTempDirectory({ prefix: projectName });

            const result = await runCLI(["create", projectName, "--type", "nextjs"], {
                cwd: tempDir.path,
            });

            // エラーが適切に処理されることを確認
            assertCLIResult.failure(result);
            assertCLIResult.containsError(result, "既に存在");
        });
    });

    describe("Expo プロジェクト生成", () => {
        test("TypeScript Expo プロジェクトが正常に生成される", async () => {
            if (shouldSkipTest("slow")) {
                return;
            }

            const projectName = "test-expo-ts";
            const result = await runCLI(["create", projectName, "--type", "expo", "--typescript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.EXPO,
            });

            assertCLIResult.success(result);

            const projectPath = `${tempDir.path}/${projectName}`;
            await assertProject.exists(projectPath);
            await assertProject.isType(projectPath, "expo");
            await assertProject.hasFiles(projectPath, PROJECT_TYPES.EXPO.expectedFiles);
            await assertProject.hasDependencies(projectPath, PROJECT_TYPES.EXPO.expectedDependencies);
        });
    });

    describe("Tauri プロジェクト生成", () => {
        test("TypeScript Tauri プロジェクトが正常に生成される", async () => {
            if (shouldSkipTest("slow")) {
                return;
            }

            const projectName = "test-tauri-ts";
            const result = await runCLI(["create", projectName, "--type", "tauri", "--typescript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.TAURI,
            });

            assertCLIResult.success(result);

            const projectPath = `${tempDir.path}/${projectName}`;
            await assertProject.exists(projectPath);
            await assertProject.isType(projectPath, "tauri");
            await assertProject.hasFiles(projectPath, PROJECT_TYPES.TAURI.expectedFiles);
            await assertProject.hasDependencies(projectPath, PROJECT_TYPES.TAURI.expectedDependencies);
        });
    });

    describe("モノレポ プロジェクト生成", () => {
        test("モノレポ構造が正常に生成される", async () => {
            if (shouldSkipTest("slow")) {
                return;
            }

            const projectName = "test-monorepo";
            const result = await runCLI(["create", projectName, "--monorepo", "--typescript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.MONOREPO,
            });

            assertCLIResult.success(result);

            const projectPath = `${tempDir.path}/${projectName}`;
            await assertProject.exists(projectPath);
            await assertProject.isMonorepo(projectPath, true);
            await assertProject.hasFiles(projectPath, [
                "package.json",
                "apps/.gitkeep",
                "packages/.gitkeep",
                "pnpm-workspace.yaml",
            ]);
        });
    });

    describe("エラーハンドリング", () => {
        test("無効なプロジェクトタイプでエラーが発生", async () => {
            const result = await runCLI(["create", "test-project", "--type", "invalid-type"], {
                cwd: tempDir.path,
            });

            assertCLIResult.failure(result);
            assertCLIResult.containsError(result, "無効な");
        });

        test("プロジェクト名なしでエラーが発生", async () => {
            const result = await runCLI(["create"], {
                cwd: tempDir.path,
            });

            assertCLIResult.failure(result);
            assertCLIResult.containsError(result, "プロジェクト名");
        });

        test("無効な文字を含むプロジェクト名でエラーが発生", async () => {
            const result = await runCLI(["create", "invalid/project@name", "--type", "nextjs"], {
                cwd: tempDir.path,
            });

            assertCLIResult.failure(result);
            assertCLIResult.containsError(result, "無効な文字");
        });
    });

    describe("パフォーマンステスト", () => {
        test("Next.js プロジェクト生成が制限時間内に完了する", async () => {
            if (shouldSkipTest("slow")) {
                return;
            }

            const projectName = "perf-test-nextjs";
            const result = await runCLI(["create", projectName, "--type", "nextjs", "--typescript"], {
                cwd: tempDir.path,
                timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS,
            });

            assertCLIResult.success(result);
            assertCLIResult.performanceThreshold(result, PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS);
        });

        test("複数プロジェクトの並行生成", async () => {
            if (shouldSkipTest("slow")) {
                return;
            }

            const projects = [
                { name: "parallel-1", type: "nextjs" },
                { name: "parallel-2", type: "nextjs" },
            ];

            const promises = projects.map((project) =>
                runCLI(["create", project.name, "--type", project.type, "--typescript"], {
                    cwd: tempDir.path,
                    timeout: PERFORMANCE_THRESHOLDS.PROJECT_CREATION.NEXTJS,
                })
            );

            const results = await Promise.all(promises);

            // 全ての実行が成功することを確認
            for (const result of results) {
                assertCLIResult.success(result);
            }

            // プロジェクトが正常に作成されていることを確認
            for (const project of projects) {
                const projectPath = `${tempDir.path}/${project.name}`;
                await assertProject.exists(projectPath);
            }
        });
    });
});

// EOF
