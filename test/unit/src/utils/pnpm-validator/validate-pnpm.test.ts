/**
 * pnpmバリデーション機能のユニットテスト
 *
 * このテストファイルでは、pnpmのバージョン検証機能および
 * 新しく追加された詳細情報取得機能をテストします。
 */

import type { ExecSyncOptions } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validatePnpm, validatePnpmWithDetails } from "../../../../../src/utils/pnpm-validator/validate-pnpm.js";

// child_processモジュールのモック
vi.mock("node:child_process", () => ({
    execSync: vi.fn(),
}));

// i18nモジュールのモック
vi.mock("../../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            pnpmVersionTooOld: vi.fn(
                (version, minVersion) =>
                    `pnpm バージョン ${version} は古すぎます。バージョン ${minVersion} 以上が必要です。`
            ),
            pnpmVersionValid: vi.fn((version) => `✅ pnpm バージョン ${version} が確認されました`),
            pnpmNotFound: "pnpm が見つかりません。",
        },
    })),
}));

// shell-helperモジュールのモック
vi.mock("../../../../../src/utils/shell-helper/index.js", () => ({
    getShellForPlatform: vi.fn(() => "/bin/bash"),
}));

// show-install-guideモジュールのモック
vi.mock("../../../../../src/utils/pnpm-validator/show-install-guide.js", () => ({
    showPnpmInstallGuide: vi.fn(),
}));

// consoleメソッドのモック
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {
    // 意図的に空のモック実装
});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // 意図的に空のモック実装
});

describe("pnpmバリデーション機能", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("validatePnpm（既存API）", () => {
        it("有効なpnpmバージョンでtrueを返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("10.18.1\n");

            // 実行
            const result = validatePnpm();

            // 検証
            expect(result).toBe(true);
            expect(execSync).toHaveBeenCalledWith("pnpm --version", expect.any(Object));
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining("✅ pnpm バージョン 10.18.1 が確認されました")
            );
        });

        it("古いpnpmバージョンでfalseを返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("9.5.0\n");

            // 実行
            const result = validatePnpm();

            // 検証
            expect(result).toBe(false);
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("pnpm バージョン 9.5.0 は古すぎます")
            );
        });

        it("pnpmが見つからない場合falseを返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error("Command not found");
            });

            // 実行
            const result = validatePnpm();

            // 検証
            expect(result).toBe(false);
            expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("pnpm が見つかりません"));
        });
    });

    describe("validatePnpmWithDetails（新しいAPI）", () => {
        it("有効なpnpmバージョンで詳細な結果を返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("10.18.1\n");

            // 実行
            const result = validatePnpmWithDetails();

            // 検証
            expect(result).toEqual({
                isValid: true,
                version: "10.18.1",
                majorVersion: 10,
            });
            expect(execSync).toHaveBeenCalledWith("pnpm --version", expect.any(Object));
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining("✅ pnpm バージョン 10.18.1 が確認されました")
            );
        });

        it("古いpnpmバージョンで詳細なエラー情報を返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("9.5.0\n");

            // 実行
            const result = validatePnpmWithDetails();

            // 検証
            expect(result).toEqual({
                isValid: false,
                version: "9.5.0",
                majorVersion: 9,
                error: "pnpm バージョン 9.5.0 は古すぎます。バージョン 10 以上が必要です。",
            });
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining("pnpm バージョン 9.5.0 は古すぎます")
            );
        });

        it("pnpmが見つからない場合詳細なエラー情報を返す", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error("Command not found");
            });

            // 実行
            const result = validatePnpmWithDetails();

            // 検証
            expect(result).toEqual({
                isValid: false,
                error: "pnpm が見つかりません。",
            });
            expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("pnpm が見つかりません"));
        });

        it("異なるバージョン形式を正しく処理する", async () => {
            const testCases = [
                { input: "10.18.1", expectedMajor: 10 },
                { input: "11.0.0-beta.1", expectedMajor: 11 },
                { input: "10.18.1-next.2", expectedMajor: 10 },
                { input: "12.1.0", expectedMajor: 12 },
            ];

            for (const testCase of testCases) {
                // モック設定
                const { execSync } = await import("node:child_process");
                vi.mocked(execSync).mockReturnValue(`${testCase.input}\n`);

                // 実行
                const result = validatePnpmWithDetails();

                // 検証
                expect(result.isValid).toBe(true);
                expect(result.version).toBe(testCase.input);
                expect(result.majorVersion).toBe(testCase.expectedMajor);

                // モッククリア（次のテストケース用）
                vi.clearAllMocks();
            }
        });

        it("適切なexecSyncオプションで実行される", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("10.18.1\n");

            // 実行
            validatePnpmWithDetails();

            // 検証
            expect(execSync).toHaveBeenCalledWith("pnpm --version", {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
                shell: "/bin/bash",
            } satisfies ExecSyncOptions);
        });

        it("バージョン文字列から空白を適切に除去する", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("  10.18.1  \n\r");

            // 実行
            const result = validatePnpmWithDetails();

            // 検証
            expect(result.version).toBe("10.18.1");
            expect(result.majorVersion).toBe(10);
        });
    });

    describe("エラーハンドリング", () => {
        it("予期しないexecSyncエラーを適切に処理する", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error("Unexpected system error");
            });

            // 実行・検証（validatePnpm）
            const result1 = validatePnpm();
            expect(result1).toBe(false);

            // 実行・検証（validatePnpmWithDetails）
            const result2 = validatePnpmWithDetails();
            expect(result2.isValid).toBe(false);
            expect(result2.error).toBe("pnpm が見つかりません。");
        });

        it("不正なバージョン文字列を処理する", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            vi.mocked(execSync).mockReturnValue("invalid-version\n");

            // 実行
            const result = validatePnpmWithDetails();

            // 検証（NaN < MIN_PNPM_VERSIONはfalseなので、バリデーションは通る）
            expect(result.isValid).toBe(true);
            expect(result.version).toBe("invalid-version");
            expect(result.majorVersion).toBeNaN();
        });
    });

    describe("showPnpmInstallGuide統合", () => {
        it("バリデーション失敗時にインストールガイドが表示される", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            const { showPnpmInstallGuide } = await import(
                "../../../../../src/utils/pnpm-validator/show-install-guide.js"
            );
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error("Command not found");
            });

            // 実行
            validatePnpm();
            validatePnpmWithDetails();

            // 検証
            expect(showPnpmInstallGuide).toHaveBeenCalledTimes(2);
        });

        it("バリデーション成功時にインストールガイドが表示されない", async () => {
            // モック設定
            const { execSync } = await import("node:child_process");
            const { showPnpmInstallGuide } = await import(
                "../../../../../src/utils/pnpm-validator/show-install-guide.js"
            );
            vi.mocked(execSync).mockReturnValue("10.18.1\n");

            // 実行
            validatePnpm();
            validatePnpmWithDetails();

            // 検証
            expect(showPnpmInstallGuide).not.toHaveBeenCalled();
        });
    });
});

// EOF
