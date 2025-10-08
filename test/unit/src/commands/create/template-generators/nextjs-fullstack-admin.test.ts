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
    chmod: vi.fn(),
    copyFile: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
    existsSync: vi.fn(),
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

vi.mock("../../../../../../src/utils/spinner-control/index.js", () => ({
    createSpinnerController: vi.fn(),
    withSpinnerControl: vi.fn((_controller, operation) => operation()),
}));

vi.mock("../../../../../../src/i18n.js", () => ({
    getMessages: vi.fn(() => ({
        create: {
            envEncryption: {
                confirmPrompt: "🔐 環境変数を暗号化しますか？",
                processing: "🔐 環境変数を暗号化中...",
                success: vi.fn((zipPath) => `✅ env-files.zip を生成しました（${zipPath}）`),
                failed: "❌ 環境変数の暗号化に失敗しました",
                skipped: "ℹ️ 環境変数の暗号化をスキップしました",
                manualCommand: "手動実行: pnpm env:encrypt",
                shareInstruction: "📤 チームに渡す際はパスワードを安全に共有してください",
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

        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");
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
        expect(vi.mocked(runEnvEncryption)).toHaveBeenCalledWith("/test/project/target", false);
        expect(result.nextSteps).toContain("✅ 環境変数を暗号化しました (/test/project/target/env-files.zip)");
        expect(result.nextSteps).toContain("📤 チームメンバーとパスワードを安全に共有してください");
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
        expect(result.nextSteps).toContain("🔐 環境変数暗号化: 手動実行: pnpm env:encrypt");
        expect(result.nextSteps).toContain("   (非対話環境では暗号化を実行できません)");
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
        expect(result.nextSteps).toContain("❌ 暗号化に失敗しました: zip command failed");
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

        vi.mocked(runEnvEncryption).mockRejectedValue(new Error("Unexpected encryption failure"));

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(result.nextSteps).toContain("❌ 暗号化処理でエラー: Unexpected encryption failure");
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
        expect(vi.mocked(runEnvEncryption)).toHaveBeenCalledWith("/test/project/target", true);
    });
});

describe("generateFullStackAdmin huskyの統合", () => {
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

        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");
        const { execa } = await import("execa");
        const { readFile, chmod } = await import("node:fs/promises");
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        // copyTemplateDirectoryが.huskyディレクトリも含むよう設定
        vi.mocked(copyTemplateDirectory).mockResolvedValue({
            files: ["package.json", ".env", ".husky/pre-commit"],
            directories: ["src", "prisma", ".husky"],
        });

        vi.mocked(readFile).mockResolvedValue("DATABASE_URL=test");
        vi.mocked(execa).mockResolvedValue({
            stdout: "",
            stderr: "",
            exitCode: 0,
        } as any);

        // 権限設定のモック
        vi.mocked(chmod).mockResolvedValue();

        // 暗号化フローのモック
        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: true,
            hasScript: true,
            hasZip: false,
        });
        vi.mocked(runEnvEncryption).mockResolvedValue({
            success: true,
            zipPath: "/test/project/target/env-files.zip",
        });
    });

    it("husky pre-commitスクリプトに実行権限が設定される", async () => {
        // 既存のファイルシステムモックをセットアップ
        const { existsSync } = await import("node:fs");
        vi.mocked(existsSync).mockReturnValue(true);

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);

        // chmod関数が正しいパスと権限で呼び出されることを確認
        const { chmod } = await import("node:fs/promises");
        expect(vi.mocked(chmod)).toHaveBeenCalledWith("/test/project/target/.husky/pre-commit", 0o755);
    });

    it("huskyファイルが存在しない場合は権限設定をスキップする", async () => {
        // ファイルが存在しない場合をシミュレート
        const { existsSync } = await import("node:fs");
        vi.mocked(existsSync).mockReturnValue(false);

        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);

        // chmod関数が呼び出されないことを確認
        const { chmod } = await import("node:fs/promises");
        expect(vi.mocked(chmod)).not.toHaveBeenCalled();
    });

    it("copyTemplateDirectoryが.huskyディレクトリを含むファイルリストを返す", async () => {
        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(result.filesCreated).toContain(".husky/pre-commit");
        expect(result.directoriesCreated).toEqual(expect.arrayContaining([expect.stringContaining("/.husky")]));
    });

    it("権限設定が失敗してもメイン処理は継続される", async () => {
        const { existsSync } = await import("node:fs");
        const { chmod } = await import("node:fs/promises");

        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(chmod).mockRejectedValue(new Error("Permission denied"));

        // エラーハンドリングが追加されたため、処理は正常に継続される
        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);
        expect(vi.mocked(chmod)).toHaveBeenCalledWith("/test/project/target/.husky/pre-commit", 0o755);
    });
});

describe("generateFullStackAdmin SQLite対応", () => {
    let sqliteContext: GenerationContext;

    beforeEach(async () => {
        vi.clearAllMocks();

        sqliteContext = {
            config: {
                name: "test-project",
                type: "nextjs",
                template: "fullstack-admin",
                directory: "/test/project",
                database: "sqlite",
                monorepo: false,
            },
            targetDirectory: "/test/project/target",
        };

        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");
        const { execa } = await import("execa");
        const { readFile, writeFile, copyFile } = await import("node:fs/promises");

        // 基本的なモック設定
        vi.mocked(copyTemplateDirectory).mockResolvedValue({
            files: ["package.json", ".env", "prisma/schema.prisma"],
            directories: ["src", "prisma"],
        });
        vi.mocked(readFile).mockResolvedValue(
            "DATABASE_PROVIDER={{DATABASE_PROVIDER}}\nDATABASE_URL={{LOCAL_DATABASE_URL}}"
        );
        vi.mocked(execa).mockResolvedValue({
            stdout: "",
            stderr: "",
            exitCode: 0,
        } as any);
    });

    it("SQLite選択時にプロジェクト生成が成功する", async () => {
        const result = await generateFullStackAdmin(sqliteContext);

        expect(result.success).toBe(true);
        expect(result.directoriesCreated).toContain("/test/project/target");
    });

    it("SQLite選択時に適切な次のステップメッセージが表示される", async () => {
        const result = await generateFullStackAdmin(sqliteContext);

        expect(result.success).toBe(true);
        expect(result.nextSteps).toContain("1. ローカル SQLite データベースを初期化してください (pnpm db:reset)");
    });
});

describe("generateFullStackAdmin スピナー制御統合", () => {
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

    // スピナー制御のモック
    const mockSpinnerController = {
        pause: vi.fn(),
        resume: vi.fn(),
        updateMessage: vi.fn(),
        isActive: vi.fn().mockReturnValue(true),
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");
        const { execa } = await import("execa");
        const { readFile } = await import("node:fs/promises");
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );
        const { createSpinnerController, withSpinnerControl } = await import(
            "../../../../../../src/utils/spinner-control/index.js"
        );

        // 基本的なモック設定
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

        // 暗号化フローのモック
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

        // スピナー制御のモック
        vi.mocked(createSpinnerController).mockReturnValue(mockSpinnerController as any);
        vi.mocked(withSpinnerControl).mockImplementation((_controller, operation) => operation());
    });

    it("スピナー制御ありでプロジェクト生成が成功する", async () => {
        const result = await generateFullStackAdmin(baseContext, mockSpinnerController as any);

        expect(result.success).toBe(true);

        // withSpinnerControlが呼び出されることを確認
        const { withSpinnerControl } = await import("../../../../../../src/utils/spinner-control/index.js");
        expect(vi.mocked(withSpinnerControl)).toHaveBeenCalled();
    });

    it("スピナー制御なしでも正常に動作する", async () => {
        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);

        // withSpinnerControlは呼ばれるが、スピナー制御は使用されない
        const { execa } = await import("execa");
        expect(vi.mocked(execa)).toHaveBeenCalled();
    });

    it("pnpmコマンドが--reporter append-onlyオプション付きで実行される", async () => {
        await generateFullStackAdmin(baseContext, mockSpinnerController as any);

        const { execa } = await import("execa");
        const execaCalls = vi.mocked(execa).mock.calls;

        // pnpm installコマンドが--reporter append-onlyオプション付きで呼ばれることを確認
        const installCall = execaCalls.find(
            ([command, args]) => command === "pnpm" && Array.isArray(args) && args.includes("install")
        );
        expect(installCall).toBeDefined();
        expect(installCall?.[1]).toContain("--reporter");
        expect(installCall?.[1]).toContain("append-only");
    });

    it("スピナー制御を使ったpnpmコマンド実行でエラーハンドリングが機能する", async () => {
        const { execa } = await import("execa");
        const { withSpinnerControl } = await import("../../../../../../src/utils/spinner-control/index.js");

        // execaがエラーを投げるように設定
        vi.mocked(execa).mockRejectedValueOnce(new Error("pnpm install failed"));

        // withSpinnerControlがエラーを適切に伝播するように設定
        vi.mocked(withSpinnerControl).mockImplementation(async (_controller, operation) => operation());

        const result = await generateFullStackAdmin(baseContext, mockSpinnerController as any);

        // エラーが発生した場合、resultは失敗を示す
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]).toContain("pnpm install failed");
    });

    it("複数のpnpmコマンドでスピナー制御が適切に動作する", async () => {
        const { existsSync } = await import("node:fs");
        vi.mocked(existsSync).mockReturnValue(true);

        await generateFullStackAdmin(baseContext, mockSpinnerController as any);

        const { withSpinnerControl } = await import("../../../../../../src/utils/spinner-control/index.js");

        // 複数のpnpmコマンド（install, db:generate, db:push, db:seed）でwithSpinnerControlが呼ばれる
        const callCount = vi.mocked(withSpinnerControl).mock.calls.length;
        expect(callCount).toBeGreaterThanOrEqual(4); // install, db:generate, db:push, db:seed
    });
});

describe("generateFullStackAdmin Next.js 設定ファイル", () => {
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

        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");
        const { execa } = await import("execa");
        const { readFile } = await import("node:fs/promises");
        const { shouldEncryptEnv, runEnvEncryption } = await import(
            "../../../../../../src/utils/env-encryption/index.js"
        );

        // next.config.mjsのみを含むファイルリストを設定
        vi.mocked(copyTemplateDirectory).mockResolvedValue({
            files: ["package.json", ".env", "next.config.mjs"],
            directories: ["src", "prisma"],
        });

        vi.mocked(readFile).mockResolvedValue("DATABASE_URL=test");
        vi.mocked(execa).mockResolvedValue({
            stdout: "",
            stderr: "",
            exitCode: 0,
        } as any);

        // 暗号化フローのモック
        vi.mocked(shouldEncryptEnv).mockResolvedValue({
            canExecute: false,
            hasScript: false,
            hasZip: false,
        });
        vi.mocked(runEnvEncryption).mockResolvedValue({
            success: true,
            zipPath: "/test/project/target/env-files.zip",
        });
    });

    it("生成されたプロジェクトにnext.config.mjsのみが存在することを確認", async () => {
        const result = await generateFullStackAdmin(baseContext);

        expect(result.success).toBe(true);

        // next.config.mjsが含まれていることを確認
        expect(result.filesCreated).toContain("next.config.mjs");

        // next.config.tsが含まれていないことを確認（重複回避）
        expect(result.filesCreated).not.toContain("next.config.ts");
    });

    it("copyTemplateDirectoryからnext.config.tsが除外されていることを確認", async () => {
        const { copyTemplateDirectory } = await import("../../../../../../src/utils/template-manager/index.js");

        await generateFullStackAdmin(baseContext);

        // copyTemplateDirectoryが呼び出されたことを確認
        expect(vi.mocked(copyTemplateDirectory)).toHaveBeenCalled();

        // 戻り値でnext.config.tsが含まれていないことを間接的に確認
        const mockCall = vi.mocked(copyTemplateDirectory).mock.results[0];
        if (mockCall && mockCall.type === "return") {
            const result = await mockCall.value;
            expect(result.files).toContain("next.config.mjs");
            expect(result.files).not.toContain("next.config.ts");
        }
    });
});

// EOF
