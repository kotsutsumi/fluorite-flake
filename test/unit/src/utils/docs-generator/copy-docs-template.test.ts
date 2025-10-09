/**
 * copy-docs-template.ts のユニットテスト
 *
 * Nextraドキュメントテンプレートのコピー処理をテストします。
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyDocsTemplate } from "../../../../../src/utils/docs-generator/copy-docs-template.js";
import type { DocsTemplateOptions } from "../../../../../src/utils/docs-generator/copy-docs-template.js";

// Node.js fs モジュールをモック
vi.mock("node:fs", () => ({
    default: {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        readdirSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    },
}));

// console メソッドをモック
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("copyDocsTemplate", () => {
    beforeEach(() => {
        // 各テスト前にモックをリセット
        vi.clearAllMocks();
    });

    it("モノレポ構造での正常なテンプレートコピー", async () => {
        // テスト設定
        const options: DocsTemplateOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: true,
            title: "Test Documentation",
            description: "Test description",
        };

        // fs.existsSync のモック（テンプレートディレクトリが存在する）
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // fs.readdirSync のモック（テンプレートディレクトリにファイルが存在する）
        vi.mocked(fs.readdirSync).mockReturnValue([
            { name: "package.json", isDirectory: () => false } as any,
            { name: "README.md", isDirectory: () => false } as any,
            { name: "src", isDirectory: () => true } as any,
        ]);

        // fs.readFileSync のモック
        vi.mocked(fs.readFileSync).mockReturnValue("test file content");

        // テスト実行
        const result = await copyDocsTemplate(options);

        // 検証
        expect(result).toBe(true);
        expect(fs.mkdirSync).toHaveBeenCalledWith("/test/output/apps/docs", { recursive: true });
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("Nextraドキュメントテンプレートをコピーしました")
        );
    });

    it("単一プロジェクト構造での正常なテンプレートコピー", async () => {
        // テスト設定
        const options: DocsTemplateOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: false,
            title: "Test Documentation",
            description: "Test description",
        };

        // fs.existsSync のモック（テンプレートディレクトリが存在する）
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // fs.readdirSync のモック
        vi.mocked(fs.readdirSync).mockReturnValue([
            { name: "package.json", isDirectory: () => false } as any,
        ]);

        // fs.readFileSync のモック
        vi.mocked(fs.readFileSync).mockReturnValue("test file content");

        // テスト実行
        const result = await copyDocsTemplate(options);

        // 検証
        expect(result).toBe(true);
        expect(fs.mkdirSync).toHaveBeenCalledWith("/test/output/docs", { recursive: true });
    });

    it("テンプレートディレクトリが存在しない場合のエラーハンドリング", async () => {
        // テスト設定
        const options: DocsTemplateOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: true,
        };

        // fs.existsSync のモック（テンプレートディレクトリが存在しない）
        vi.mocked(fs.existsSync).mockReturnValue(false);

        // テスト実行
        const result = await copyDocsTemplate(options);

        // 検証
        expect(result).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("テンプレートディレクトリが見つかりません")
        );
    });

    it("ファイルコピー中のエラーハンドリング", async () => {
        // テスト設定
        const options: DocsTemplateOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: true,
        };

        // fs.existsSync のモック（テンプレートディレクトリが存在する）
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // fs.mkdirSync でエラーが発生するモック
        vi.mocked(fs.mkdirSync).mockImplementation(() => {
            throw new Error("Permission denied");
        });

        // テスト実行
        const result = await copyDocsTemplate(options);

        // 検証
        expect(result).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("ドキュメントテンプレートのコピーに失敗しました"),
            expect.any(Error)
        );
    });
});

// EOF