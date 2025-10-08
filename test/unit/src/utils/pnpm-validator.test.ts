/**
 * pnpm-validatorのユニットテスト
 */
import { execSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validatePnpm } from "../../../../src/utils/pnpm-validator/index.js";

// execSyncをモック化：実際のコマンド実行を防ぐ
vi.mock("node:child_process", () => ({
    execSync: vi.fn(),
}));

// chalkとi18nをモック化：外部依存関係を制御する
vi.mock("chalk", () => ({
    default: {
        red: vi.fn((text) => text),
        green: vi.fn((text) => text),
        yellow: vi.fn((text) => text),
        cyan: vi.fn((text) => text),
        gray: vi.fn((text) => text),
    },
}));

vi.mock("../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            pnpmNotFound: "❌ pnpm が見つかりません。",
            pnpmVersionTooOld: vi.fn(
                (version, minVersion) => `❌ pnpm v${version} が検出されました。v${minVersion}.0.0以上が必要です。`
            ),
            pnpmVersionValid: vi.fn((version) => `✅ pnpm v${version} を検出しました。`),
            pnpmInstallGuide: "📦 pnpm インストールガイド:",
            pnpmInstallCommands: [
                "  npm install -g pnpm@latest",
                "  # または",
                "  curl -fsSL https://get.pnpm.io/install.sh | sh -",
            ],
            pnpmMoreInfo: "  詳細情報: https://pnpm.io/installation",
        },
    })),
}));

// console.logとconsole.errorをモック化
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {
    // 何もしない
});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {
    // 何もしない
});

describe("pnpm-validator", () => {
    beforeEach(() => {
        // 各テスト前にモックをリセット
        vi.clearAllMocks();
    });

    describe("validatePnpm", () => {
        it("pnpmのバージョンが10以上の場合はtrueを返す", () => {
            // pnpm --version が "10.1.0" を返すようにモック
            vi.mocked(execSync).mockReturnValue("10.1.0");

            const result = validatePnpm();

            expect(result).toBe(true);
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ pnpm v10.1.0 を検出しました。");
            expect(mockConsoleError).not.toHaveBeenCalled();
        });

        it("pnpmのバージョンが10未満の場合はfalseを返す", () => {
            // pnpm --version が "9.12.1" を返すようにモック
            vi.mocked(execSync).mockReturnValue("9.12.1");

            const result = validatePnpm();

            expect(result).toBe(false);
            expect(mockConsoleError).toHaveBeenCalledWith("❌ pnpm v9.12.1 が検出されました。v10.0.0以上が必要です。");
            expect(mockConsoleLog).toHaveBeenCalledWith("\n📦 pnpm インストールガイド:");
        });

        it("pnpmが存在しない場合はfalseを返す", () => {
            // execSyncがエラーを投げるようにモック
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error("Command failed");
            });

            const result = validatePnpm();

            expect(result).toBe(false);
            expect(mockConsoleError).toHaveBeenCalledWith("❌ pnpm が見つかりません。");
            expect(mockConsoleLog).toHaveBeenCalledWith("\n📦 pnpm インストールガイド:");
        });

        it("バージョン番号が正確にパースされる", () => {
            // メジャーバージョンのみでテスト
            vi.mocked(execSync).mockReturnValue("11");

            const result = validatePnpm();

            expect(result).toBe(true);
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ pnpm v11 を検出しました。");
        });

        it("バージョン10.0.0で境界値テスト", () => {
            vi.mocked(execSync).mockReturnValue("10.0.0");

            const result = validatePnpm();

            expect(result).toBe(true);
            expect(mockConsoleLog).toHaveBeenCalledWith("✅ pnpm v10.0.0 を検出しました。");
        });

        it("バージョン9.99.99で境界値テスト（false）", () => {
            vi.mocked(execSync).mockReturnValue("9.99.99");

            const result = validatePnpm();

            expect(result).toBe(false);
            expect(mockConsoleError).toHaveBeenCalledWith("❌ pnpm v9.99.99 が検出されました。v10.0.0以上が必要です。");
        });
    });
});

// EOF
