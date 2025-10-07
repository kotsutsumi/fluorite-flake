/**
 * env-encryptionユーティリティのユニットテスト
 * - 暗号化実行可否判定のテスト
 * - 暗号化実行処理のテスト
 * - プロンプト処理のテスト
 */

import { existsSync } from "node:fs";
import { execa } from "execa";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createEncryptionPrompt,
    runEnvEncryption,
    shouldEncryptEnv,
} from "../../../../src/utils/env-encryption/index.js";

// 外部依存関係をモック化
vi.mock("node:fs", () => ({
    existsSync: vi.fn(),
}));

vi.mock("execa", () => ({
    execa: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
    confirm: vi.fn(),
}));

vi.mock("../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            envEncryption: {
                confirmPrompt: "🔐 環境変数を暗号化しますか？",
                processing: "🔐 環境変数を暗号化中...",
                success: vi.fn(
                    (zipPath) => `✅ env-files.zip を生成しました（${zipPath}）`
                ),
                failed: "❌ 環境変数の暗号化に失敗しました",
                skipped: "ℹ️ 環境変数の暗号化をスキップしました",
                manualCommand: "手動実行: pnpm env:encrypt",
                shareInstruction:
                    "📤 チームに渡す際はパスワードを安全に共有してください",
            },
        },
    })),
}));

// console のモック化
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {
    // モック関数として意図的に空の実装
});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // モック関数として意図的に空の実装
});

describe("env-encryption ユーティリティ", () => {
    beforeEach(() => {
        // 各テスト前にモックをリセット
        vi.clearAllMocks();
        // TTY環境をシミュレート（プロンプトテスト用）
        Object.defineProperty(process.stdin, "isTTY", {
            value: true,
            configurable: true,
        });
    });

    describe("shouldEncryptEnv", () => {
        it("すべての条件が満たされた場合はcanExecute: trueを返す", async () => {
            // スクリプトファイルが存在する
            vi.mocked(existsSync).mockReturnValue(true);

            // zipコマンドが利用可能
            vi.mocked(execa).mockResolvedValue({
                stdout: "zip --version output",
                stderr: "",
                exitCode: 0,
                command: "zip",
                escapedCommand: "zip",
                failed: false,
                timedOut: false,
                isCanceled: false,
                killed: false,
            } as any);

            const result = await shouldEncryptEnv("/test/app");

            expect(result.canExecute).toBe(true);
            expect(result.isTTY).toBe(true);
            expect(result.hasScript).toBe(true);
            expect(result.hasZip).toBe(true);
            expect(result.reason).toBeUndefined();
        });

        it("非TTY環境の場合はcanExecute: falseを返す", async () => {
            // 非TTY環境をシミュレート
            Object.defineProperty(process.stdin, "isTTY", {
                value: false,
                configurable: true,
            });

            const result = await shouldEncryptEnv("/test/app");

            expect(result.canExecute).toBe(false);
            expect(result.isTTY).toBe(false);
            expect(result.reason).toBe("非対話環境では暗号化を実行できません");
        });

        it("スクリプトファイルが存在しない場合はcanExecute: falseを返す", async () => {
            // スクリプトファイルが存在しない
            vi.mocked(existsSync).mockReturnValue(false);

            const result = await shouldEncryptEnv("/test/app");

            expect(result.canExecute).toBe(false);
            expect(result.hasScript).toBe(false);
            expect(result.reason).toBe(
                "env-tools.tsスクリプトが見つかりません"
            );
        });

        it("zipコマンドが利用できない場合はcanExecute: falseを返す", async () => {
            // スクリプトファイルが存在する
            vi.mocked(existsSync).mockReturnValue(true);

            // zipコマンドが失敗
            vi.mocked(execa).mockRejectedValue(
                new Error("zip command not found")
            );

            const result = await shouldEncryptEnv("/test/app");

            expect(result.canExecute).toBe(false);
            expect(result.hasZip).toBe(false);
            expect(result.reason).toBe("zipコマンドが利用できません");
        });
    });

    describe("createEncryptionPrompt", () => {
        it("ユーザーがYESを選択した場合はshouldEncrypt: trueを返す", async () => {
            const { confirm } = await import("@clack/prompts");
            vi.mocked(confirm).mockResolvedValue(true);

            const result = await createEncryptionPrompt();

            expect(result.shouldEncrypt).toBe(true);
            expect(result.cancelled).toBe(false);
        });

        it("ユーザーがNOを選択した場合はshouldEncrypt: falseを返す", async () => {
            const { confirm } = await import("@clack/prompts");
            vi.mocked(confirm).mockResolvedValue(false);

            const result = await createEncryptionPrompt();

            expect(result.shouldEncrypt).toBe(false);
            expect(result.cancelled).toBe(false);
        });

        it("プロンプトがキャンセルされた場合はcancelled: trueを返す", async () => {
            const { confirm } = await import("@clack/prompts");
            // シンボルを返すことでキャンセルをシミュレート
            vi.mocked(confirm).mockResolvedValue(Symbol("cancelled") as any);

            const result = await createEncryptionPrompt();

            expect(result.shouldEncrypt).toBe(false);
            expect(result.cancelled).toBe(true);
        });

        it("プロンプトが失敗した場合はcancelled: trueを返す", async () => {
            const { confirm } = await import("@clack/prompts");
            vi.mocked(confirm).mockRejectedValue(new Error("Prompt failed"));

            const result = await createEncryptionPrompt();

            expect(result.shouldEncrypt).toBe(false);
            expect(result.cancelled).toBe(true);
        });
    });

    describe("runEnvEncryption", () => {
        it("単一リポジトリで暗号化が成功した場合はsuccess: trueを返す", async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: "encryption completed",
                stderr: "",
                exitCode: 0,
                command: "pnpm",
                escapedCommand: "pnpm",
                failed: false,
                timedOut: false,
                isCanceled: false,
                killed: false,
            } as any);

            const result = await runEnvEncryption("/test/app", false);

            expect(result.success).toBe(true);
            expect(result.zipPath).toBe("/test/app/env-files.zip");
            expect(vi.mocked(execa)).toHaveBeenCalledWith(
                "pnpm",
                ["env:encrypt"],
                {
                    cwd: "/test/app",
                    stdio: "inherit",
                    timeout: 120_000,
                }
            );
            expect(mockConsoleLog).toHaveBeenCalledWith(
                "🔐 環境変数を暗号化中..."
            );
        });

        it("モノレポで暗号化が成功した場合はsuccess: trueを返す", async () => {
            vi.mocked(execa).mockResolvedValue({
                stdout: "encryption completed",
                stderr: "",
                exitCode: 0,
                command: "pnpm",
                escapedCommand: "pnpm",
                failed: false,
                timedOut: false,
                isCanceled: false,
                killed: false,
            } as any);

            const result = await runEnvEncryption("/test/app", true);

            expect(result.success).toBe(true);
            expect(vi.mocked(execa)).toHaveBeenCalledWith(
                "pnpm",
                ["--filter", "/test/app", "env:encrypt"],
                {
                    cwd: expect.any(String), // process.cwd()の値
                    stdio: "inherit",
                    timeout: 120_000,
                }
            );
        });

        it("暗号化が失敗した場合はsuccess: falseを返す", async () => {
            const error = new Error("encryption failed");
            vi.mocked(execa).mockRejectedValue(error);

            const result = await runEnvEncryption("/test/app", false);

            expect(result.success).toBe(false);
            expect(result.error).toBe("encryption failed");
            expect(mockConsoleError).toHaveBeenCalledWith(
                "❌ 環境変数の暗号化に失敗しました"
            );
        });

        it("未知のエラーが発生した場合は適切にハンドリングする", async () => {
            vi.mocked(execa).mockRejectedValue("string error");

            const result = await runEnvEncryption("/test/app", false);

            expect(result.success).toBe(false);
            expect(result.error).toBe("不明なエラーが発生しました");
        });
    });

    afterEach(() => {
        mockConsoleLog.mockRestore();
        mockConsoleError.mockRestore();
    });
});

// EOF
