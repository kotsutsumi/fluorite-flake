/**
 * E2Eテスト用カスタムアサーション
 * 共通的な検証ロジックを提供
 */

import { expect } from "vitest";
import type { CLIResult } from "./cli-runner.js";
import type { ProjectValidation } from "./project-utils.js";
import {
    fileExists,
    getProjectInfo,
    readPackageJson,
} from "./project-utils.js";

/**
 * CLI実行結果のアサーション
 * 注意: これらの関数はテスト内で使用されることを想定しています
 */
export const assertCLIResult = {
    /**
     * 成功時のアサーション
     */
    success(result: CLIResult, message?: string): void {
        expect(
            result.exitCode,
            message || `CLI should succeed. stderr: ${result.stderr}`
        ).toBe(0);
    },

    /**
     * 失敗時のアサーション
     */
    failure(result: CLIResult, message?: string): void {
        expect(result.exitCode, message || "CLI should fail").not.toBe(0);
    },

    /**
     * 標準出力に特定の文字列が含まれることをアサート
     */
    containsOutput(result: CLIResult, text: string): void {
        expect(result.stdout).toContain(text);
    },

    /**
     * エラー出力に特定の文字列が含まれることをアサート
     */
    containsError(result: CLIResult, text: string): void {
        expect(result.stderr).toContain(text);
    },

    /**
     * 実行時間がしきい値以下であることをアサート
     */
    performanceThreshold(result: CLIResult, maxDuration: number): void {
        expect(result.duration).toBeLessThanOrEqual(maxDuration);
    },

    /**
     * 複数の条件を同時にチェック
     */
    all(
        result: CLIResult,
        conditions: {
            exitCode?: number;
            containsOutput?: string[];
            containsError?: string[];
            maxDuration?: number;
        }
    ): void {
        if (conditions.exitCode !== undefined) {
            expect(result.exitCode).toBe(conditions.exitCode);
        }

        if (conditions.containsOutput) {
            for (const text of conditions.containsOutput) {
                expect(result.stdout).toContain(text);
            }
        }

        if (conditions.containsError) {
            for (const text of conditions.containsError) {
                expect(result.stderr).toContain(text);
            }
        }

        if (conditions.maxDuration !== undefined) {
            expect(result.duration).toBeLessThanOrEqual(conditions.maxDuration);
        }
    },
};

/**
 * プロジェクト構造のアサーション
 */
export const assertProject = {
    /**
     * プロジェクトが存在することをアサート
     */
    async exists(projectPath: string): Promise<void> {
        const packageJsonExists = await fileExists(
            `${projectPath}/package.json`
        );
        expect(
            packageJsonExists,
            `Project should exist at ${projectPath}`
        ).toBe(true);
    },

    /**
     * 特定のファイルが存在することをアサート
     */
    async hasFiles(projectPath: string, files: string[]): Promise<void> {
        for (const file of files) {
            const filePath = `${projectPath}/${file}`;
            const exists = await fileExists(filePath);
            expect(exists, `File ${file} should exist in project`).toBe(true);
        }
    },

    /**
     * 特定の依存関係が含まれることをアサート
     */
    async hasDependencies(
        projectPath: string,
        dependencies: string[]
    ): Promise<void> {
        const packageJson = await readPackageJson(projectPath);
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        for (const dep of dependencies) {
            expect(
                allDeps,
                `Dependency ${dep} should be installed`
            ).toHaveProperty(dep);
        }
    },

    /**
     * プロジェクトタイプをアサート
     */
    async isType(projectPath: string, expectedType: string): Promise<void> {
        const info = await getProjectInfo(projectPath);
        expect(info.type, `Project should be of type ${expectedType}`).toBe(
            expectedType
        );
    },

    /**
     * TypeScript プロジェクトかどうかをアサート
     */
    async hasTypeScript(projectPath: string, expected = true): Promise<void> {
        const info = await getProjectInfo(projectPath);
        expect(
            info.hasTypeScript,
            `Project should ${expected ? "have" : "not have"} TypeScript`
        ).toBe(expected);
    },

    /**
     * モノレポプロジェクトかどうかをアサート
     */
    async isMonorepo(projectPath: string, expected = true): Promise<void> {
        const info = await getProjectInfo(projectPath);
        expect(
            info.isMonorepo,
            `Project should ${expected ? "be" : "not be"} a monorepo`
        ).toBe(expected);
    },

    /**
     * プロジェクト検証結果をアサート
     */
    validation(validation: ProjectValidation, shouldBeValid = true): void {
        if (shouldBeValid) {
            expect(
                validation.isValid,
                `Project validation should pass. Errors: ${validation.errors.join(", ")}`
            ).toBe(true);
            expect(validation.errors).toHaveLength(0);
        } else {
            expect(validation.isValid, "Project validation should fail").toBe(
                false
            );
            expect(validation.errors.length).toBeGreaterThan(0);
        }
    },

    /**
     * プロジェクトサイズをアサート
     */
    async sizeWithinRange(
        projectPath: string,
        minFiles: number,
        maxFiles: number,
        maxSizeBytes?: number
    ): Promise<void> {
        const info = await getProjectInfo(projectPath);

        expect(
            info.size.fileCount,
            `Project should have between ${minFiles} and ${maxFiles} files`
        ).toBeGreaterThanOrEqual(minFiles);
        expect(info.size.fileCount).toBeLessThanOrEqual(maxFiles);

        if (maxSizeBytes !== undefined) {
            expect(
                info.size.totalSize,
                `Project size should be less than ${maxSizeBytes} bytes`
            ).toBeLessThanOrEqual(maxSizeBytes);
        }
    },
};

/**
 * パフォーマンスアサーション
 */
export const assertPerformance = {
    /**
     * 実行時間がしきい値以下であることをアサート
     */
    executionTime(actualMs: number, maxMs: number, operation: string): void {
        expect(
            actualMs,
            `${operation} should complete within ${maxMs}ms`
        ).toBeLessThanOrEqual(maxMs);
    },

    /**
     * メモリ使用量がしきい値以下であることをアサート
     */
    memoryUsage(
        actualBytes: number,
        maxBytes: number,
        operation: string
    ): void {
        expect(
            actualBytes,
            `${operation} should use less than ${maxBytes} bytes of memory`
        ).toBeLessThanOrEqual(maxBytes);
    },

    /**
     * ベンチマーク結果をアサート
     */
    benchmark(
        results: {
            averageTime: number;
            minTime: number;
            maxTime: number;
        },
        thresholds: {
            averageTime: number;
            maxTime: number;
        },
        operation: string
    ): void {
        expect(
            results.averageTime,
            `${operation} average time should be within threshold`
        ).toBeLessThanOrEqual(thresholds.averageTime);
        expect(
            results.maxTime,
            `${operation} max time should be within threshold`
        ).toBeLessThanOrEqual(thresholds.maxTime);
        expect(
            results.minTime,
            `${operation} min time should be positive`
        ).toBeGreaterThan(0);
    },
};

/**
 * 国際化アサーション
 */
export const assertI18n = {
    /**
     * 特定の言語のメッセージが含まれることをアサート
     */
    containsLanguage(text: string, language: "ja" | "en"): void {
        if (language === "ja") {
            // 日本語文字（ひらがな、カタカナ、漢字）が含まれるかチェック
            const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
            expect(
                japaneseRegex.test(text),
                "Text should contain Japanese characters"
            ).toBe(true);
        } else {
            // 英語の一般的なメッセージパターンをチェック
            const englishWords = [
                "command",
                "error",
                "help",
                "version",
                "create",
                "project",
            ];
            const hasEnglishWords = englishWords.some((word) =>
                text.toLowerCase().includes(word)
            );
            expect(hasEnglishWords, "Text should contain English words").toBe(
                true
            );
        }
    },

    /**
     * ロケール固有のメッセージをアサート
     */
    localeSpecificMessage(
        result: CLIResult,
        locale: "ja" | "en",
        expectedPatterns: string[]
    ): void {
        const output = result.stdout + result.stderr;

        for (const pattern of expectedPatterns) {
            expect(
                output,
                `Output should contain locale-specific pattern: ${pattern}`
            ).toContain(pattern);
        }

        // ロケール固有の文字チェック
        this.containsLanguage(output, locale);
    },
};

/**
 * エラーハンドリングアサーション
 */
export const assertErrorHandling = {
    /**
     * 適切なエラーメッセージが表示されることをアサート
     */
    appropriateErrorMessage(result: CLIResult, context: string): void {
        assertCLIResult.failure(result);
        expect(
            result.stderr,
            `Should provide helpful error message for ${context}`
        ).not.toBe("");

        // エラーメッセージに最低限の情報が含まれているかチェック
        const hasUsefulInfo =
            result.stderr.includes("Error") ||
            result.stderr.includes("エラー") ||
            result.stderr.includes("help") ||
            result.stderr.includes("ヘルプ");
        expect(hasUsefulInfo, "Error message should be helpful").toBe(true);
    },

    /**
     * グレースフルなエラーハンドリングをアサート
     */
    gracefulFailure(result: CLIResult): void {
        assertCLIResult.failure(result);

        // スタックトレースが含まれていないことを確認（ユーザーフレンドリー）
        expect(
            result.stderr,
            "Error should not contain stack trace"
        ).not.toMatch(/at .+:\d+:\d+/);

        // エラーメッセージが空でないことを確認
        expect(
            result.stderr.trim(),
            "Error message should not be empty"
        ).not.toBe("");
    },
};

// EOF
