/**
 * nextjs-fullstack-adminテンプレートジェネレーターのユニットテスト
 * - 暗号化フロー統合のテスト
 * - エラーハンドリングのテスト
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateFullStackAdmin } from "../../../../../../src/commands/create/template-generators/nextjs-fullstack-admin.js";
import type { GenerationContext } from "../../../../../../src/commands/create/template-generators/types.js";

// 外部依存関係をモック化
vi.mock("node:fs/promises", () => ({
    copyFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
}));

vi.mock("node:path", () => ({
    join: vi.fn((...args) => args.join("/")),
}));

vi.mock("execa", () => ({
    execa: vi.fn(),
}));

vi.mock("../../../../../../src/utils/template-manager/index.js", () => ({
    copyTemplateDirectory: vi.fn(),
}));

vi.mock("../../../../../../src/utils/env-encryption/index.js", () => ({
    shouldEncryptEnv: vi.fn(),
    runEnvEncryption: vi.fn(),
}));

vi.mock("../../../../../../src/i18n.js", () => ({
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

describe("generateFullStackAdmin 暗号化統合", () => {
    // テスト用のベースコンテキスト
    const baseContext: GenerationContext = {
        config: {
            name: "test-project",
            type: "nextjs",
            template: "fullstack-admin",
            directory: "/test/project",
            database: "turso",
            monorepo: false,
        },
        targetDirectory: "/test/project/target",
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const { copyTemplateDirectory } = await import(
            "../../../../../../src/utils/template-manager/index.js"
        );
        const { execa } = await import("execa");
        const { readFile } = await import("node:fs/promises");

        vi.mocked(copyTemplateDirectory).mockResolvedValue({
            files: ["package.json", ".env"],
            directories: ["src", "prisma"],
        });

        vi.mocked(readFile).mockResolvedValue("DATABASE_URL=test");
        vi.mocked(execa).mockResolvedValue({
            stdout: "",
            stderr: "",
            exitCode: 0,
        } as any);
    });

    it("暗号化が成功した場合、nextStepsに成功メッセージが含まれる", async () => {
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: true,
            isTTY: true,
            hasScript: true,
            hasZip: true,
        });

        vi.mocked(runEnvEncryption).mockResolvedValue({
            success: true,
            zipPath: "/test/project/target/env-files.zip",
        });

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(vi.mocked(runEnvEncryption)).toHaveBeenCalledWith(
            "/test/project/target",
            false
        );
        expect(result.nextSteps).toContain(
            "✅ 環境変数を暗号化しました (/test/project/target/env-files.zip)"
        );
        expect(result.nextSteps).toContain(
            "📤 チームメンバーとパスワードを安全に共有してください"
        );
    });

    it("暗号化実行環境が整っていない場合、マニュアル手順がnextStepsに含まれる", async () => {
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: false,
            isTTY: false,
            hasScript: true,
            hasZip: true,
            reason: "非対話環境では暗号化を実行できません",
        });

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(vi.mocked(runEnvEncryption)).not.toHaveBeenCalled();
        expect(result.nextSteps).toContain(
            "🔐 環境変数暗号化: 手動実行: pnpm env:encrypt"
        );
        expect(result.nextSteps).toContain(
            "   (非対話環境では暗号化を実行できません)"
        );
    });

    it("暗号化が失敗した場合、エラーメッセージとマニュアル手順がnextStepsに含まれる", async () => {
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: true,
            isTTY: true,
            hasScript: true,
            hasZip: true,
        });

        vi.mocked(runEnvEncryption).mockResolvedValue({
            success: false,
            error: "zip command failed",
        });

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(result.nextSteps).toContain(
            "❌ 暗号化に失敗しました: zip command failed"
        );
        expect(result.nextSteps).toContain("🔐 手動実行: pnpm env:encrypt");
    });

    it("暗号化処理で予期しないエラーが発生した場合、適切にハンドリングする", async () => {
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: true,
            isTTY: true,
            hasScript: true,
            hasZip: true,
        });

        vi.mocked(runEnvEncryption).mockRejectedValue(
            new Error("Unexpected encryption failure")
        );

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(result.nextSteps).toContain(
            "❌ 暗号化処理でエラー: Unexpected encryption failure"
        );
        expect(result.nextSteps).toContain("🔐 手動実行: pnpm env:encrypt");
    });

    it("モノレポ構成で暗号化が実行される", async () => {
        const monorepoContext: GenerationContext = {
            ...baseContext,
            config: {
                ...baseContext.config,
                monorepo: true,
            },
        };

        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: true,
            isTTY: true,
            hasScript: true,
            hasZip: true,
        });

        vi.mocked(runEnvEncryption).mockResolvedValue({
            success: true,
            zipPath: "/test/project/target/env-files.zip",
        });

        const result = await generateFullStackAdmin(monorepoContext);

        expect(result.success).toBe(true);
        expect(vi.mocked(runEnvEncryption)).toHaveBeenCalledWith(
            "/test/project/target",
            true
        );
    });
});

// EOF
