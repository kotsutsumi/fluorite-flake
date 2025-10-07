/**
 * プロジェクト存在チェック機能のテスト
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { checkProjectExists } from "../../../../../src/utils/user-input/check-project-exists.js";

// ファイルシステムモックをセットアップ
vi.mock("node:fs", () => ({
    existsSync: vi.fn(),
}));

vi.mock("node:path", () => ({
    resolve: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockResolve = vi.mocked(resolve);

describe("checkProjectExists", () => {
    it("プロジェクトディレクトリが存在する場合はtrueを返す", () => {
        // モックの設定
        const projectName = "my-test-project";
        const baseDir = "/test/base";
        const expectedPath = "/test/base/my-test-project";

        mockResolve.mockReturnValue(expectedPath);
        mockExistsSync.mockReturnValue(true);

        // テスト実行
        const result = checkProjectExists(projectName, baseDir);

        // アサーション
        expect(mockResolve).toHaveBeenCalledWith(baseDir, projectName);
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(result).toBe(true);
    });

    it("プロジェクトディレクトリが存在しない場合はfalseを返す", () => {
        // モックの設定
        const projectName = "nonexistent-project";
        const baseDir = "/test/base";
        const expectedPath = "/test/base/nonexistent-project";

        mockResolve.mockReturnValue(expectedPath);
        mockExistsSync.mockReturnValue(false);

        // テスト実行
        const result = checkProjectExists(projectName, baseDir);

        // アサーション
        expect(mockResolve).toHaveBeenCalledWith(baseDir, projectName);
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(result).toBe(false);
    });

    it("ベースディレクトリが指定されない場合は現在のディレクトリを使用する", () => {
        // モックの設定
        const projectName = "my-project";
        const currentDir = process.cwd();
        const expectedPath = `/current/dir/${projectName}`;

        mockResolve.mockReturnValue(expectedPath);
        mockExistsSync.mockReturnValue(false);

        // テスト実行
        const result = checkProjectExists(projectName);

        // アサーション
        expect(mockResolve).toHaveBeenCalledWith(currentDir, projectName);
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(result).toBe(false);
    });

    it("特殊文字を含むプロジェクト名でも正しく処理する", () => {
        // モックの設定
        const projectName = "my-special_project-123";
        const baseDir = "/test/base";
        const expectedPath = "/test/base/my-special_project-123";

        mockResolve.mockReturnValue(expectedPath);
        mockExistsSync.mockReturnValue(true);

        // テスト実行
        const result = checkProjectExists(projectName, baseDir);

        // アサーション
        expect(mockResolve).toHaveBeenCalledWith(baseDir, projectName);
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(result).toBe(true);
    });
});

// EOF
