/**
 * create-docs-package-json.ts のユニットテスト
 *
 * Nextraドキュメント用のpackage.json生成処理をテストします。
 */

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createDocsPackageJson,
    extractVersionsFromProject,
} from "../../../../../src/utils/docs-generator/create-docs-package-json.js";
import type { DocsPackageJsonOptions } from "../../../../../src/utils/docs-generator/create-docs-package-json.js";

// Node.js fs モジュールをモック
vi.mock("node:fs", () => ({
    default: {
        existsSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(),
    },
}));

// console メソッドをモック
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("createDocsPackageJson", () => {
    beforeEach(() => {
        // 各テスト前にモックをリセット
        vi.clearAllMocks();
    });

    it("モノレポ構造でのpackage.json生成", async () => {
        // テスト設定
        const options: DocsPackageJsonOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: true,
            reactVersion: "^19.1.0",
            nextVersion: "^15.5.4",
            nextraVersion: "^4.6.0",
        };

        // テスト実行
        const result = await createDocsPackageJson(options);

        // 検証
        expect(result).toBe(true);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            "/test/output/apps/docs/package.json",
            expect.stringContaining('"name": "test-project-docs"'),
            "utf-8"
        );

        // package.jsonの内容を検証
        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const packageJsonContent = JSON.parse(writeCall[1] as string);

        expect(packageJsonContent.name).toBe("test-project-docs");
        expect(packageJsonContent.dependencies.next).toBe("^15.5.4");
        expect(packageJsonContent.dependencies.nextra).toBe("^4.6.0");
        expect(packageJsonContent.peerDependencies.react).toBe("^19.1.0");
        expect(packageJsonContent.dependencies.react).toBeUndefined(); // モノレポではpeerDependenciesに移動
    });

    it("単一プロジェクト構造でのpackage.json生成", async () => {
        // テスト設定
        const options: DocsPackageJsonOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: false,
            reactVersion: "^19.1.0",
            nextVersion: "^15.5.4",
            nextraVersion: "^4.6.0",
        };

        // テスト実行
        const result = await createDocsPackageJson(options);

        // 検証
        expect(result).toBe(true);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            "/test/output/docs/package.json",
            expect.stringContaining('"name": "test-project-docs"'),
            "utf-8"
        );

        // package.jsonの内容を検証
        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const packageJsonContent = JSON.parse(writeCall[1] as string);

        expect(packageJsonContent.name).toBe("test-project-docs");
        expect(packageJsonContent.dependencies.react).toBe("^19.1.0"); // 単一プロジェクトではdependenciesに含まれる
        expect(packageJsonContent.peerDependencies).toBeUndefined();
    });

    it("デフォルトバージョンでの生成", async () => {
        // テスト設定
        const options: DocsPackageJsonOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: false,
        };

        // テスト実行
        const result = await createDocsPackageJson(options);

        // 検証
        expect(result).toBe(true);

        // package.jsonの内容を検証
        const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
        const packageJsonContent = JSON.parse(writeCall[1] as string);

        expect(packageJsonContent.dependencies.react).toBe("^19.1.0");
        expect(packageJsonContent.dependencies.next).toBe("^15.5.4");
        expect(packageJsonContent.dependencies.nextra).toBe("^4.6.0");
    });

    it("ファイル書き込みエラーのハンドリング", async () => {
        // テスト設定
        const options: DocsPackageJsonOptions = {
            projectName: "test-project",
            outputPath: "/test/output",
            isMonorepo: false,
        };

        // fs.writeFileSync でエラーが発生するモック
        vi.mocked(fs.writeFileSync).mockImplementation(() => {
            throw new Error("Permission denied");
        });

        // テスト実行
        const result = await createDocsPackageJson(options);

        // 検証
        expect(result).toBe(false);
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("ドキュメント用package.jsonの生成に失敗しました"),
            expect.any(Error)
        );
    });
});

describe("extractVersionsFromProject", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("既存のpackage.jsonからバージョン情報を抽出", () => {
        // fs.existsSync のモック（package.jsonが存在する）
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // fs.readFileSync のモック
        const mockPackageJson = {
            dependencies: {
                react: "^18.2.0",
                next: "^14.0.0",
            },
            devDependencies: {
                nextra: "^3.0.0",
            },
        };
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockPackageJson));

        // テスト実行
        const result = extractVersionsFromProject("/test/project");

        // 検証
        expect(result).toEqual({
            reactVersion: "^18.2.0",
            nextVersion: "^14.0.0",
            nextraVersion: "^3.0.0",
        });
    });

    it("package.jsonが存在しない場合", () => {
        // fs.existsSync のモック（package.jsonが存在しない）
        vi.mocked(fs.existsSync).mockReturnValue(false);

        // テスト実行
        const result = extractVersionsFromProject("/test/project");

        // 検証
        expect(result).toEqual({});
    });

    it("package.jsonの読み込みエラー", () => {
        // console.warn をモック
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        // fs.existsSync のモック（package.jsonが存在する）
        vi.mocked(fs.existsSync).mockReturnValue(true);

        // fs.readFileSync でエラーが発生するモック
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            throw new Error("Parse error");
        });

        // テスト実行
        const result = extractVersionsFromProject("/test/project");

        // 検証
        expect(result).toEqual({});
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("バージョン情報の取得に失敗しました"),
            expect.any(Error)
        );

        // クリーンアップ
        warnSpy.mockRestore();
    });
});

// EOF