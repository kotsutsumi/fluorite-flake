/**
 * Turso CLI データベース関連ユーティリティのテスト
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createDatabase,
    createDatabaseToken,
    destroyDatabase,
    getDatabaseUrl,
    listDatabases,
    showDatabase,
} from "../../../../src/utils/turso-cli/database.js";

// executorモジュールをモック化
vi.mock("../../../../src/utils/turso-cli/executor.js", () => ({
    executeTursoCommand: vi.fn(),
    throwOnError: vi.fn(),
}));

describe("Turso CLI Database", () => {
    beforeEach(() => {
        // 各テストケース前にモックをリセット
        vi.clearAllMocks();
    });

    describe("listDatabases", () => {
        it("データベース一覧を正しく取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: `NAME        GROUP      URL
test-db     default    libsql://test.turso.io
prod-db     production libsql://prod.turso.io`,
            });

            // listDatabases関数を実行
            const result = await listDatabases();

            // 結果を検証
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe("test-db");
            expect(result[1].name).toBe("prod-db");
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "list"]);
        });

        it("グループフィルターを指定してデータベース一覧を取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "prod-db     production libsql://prod.turso.io",
            });

            // グループを指定してlistDatabases関数を実行
            const result = await listDatabases("production");

            // 結果を検証
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("prod-db");
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "list", "--group", "production"]);
        });

        it("空の結果を正しく処理する", async () => {
            // executeTursoCommandのモックを設定（空の結果）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "NAME        GROUP      URL",
            });

            // listDatabases関数を実行
            const result = await listDatabases();

            // 空の配列が返されることを検証
            expect(result).toHaveLength(0);
        });
    });

    describe("createDatabase", () => {
        it("基本的なデータベース作成コマンドを実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Database 'test-db' created successfully",
            });

            // createDatabase関数を実行
            const result = await createDatabase("test-db");

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "create", "test-db"]);
        });

        it("オプション付きでデータベース作成コマンドを実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Database 'test-db' created successfully in group 'production'",
            });

            // オプション付きでcreateDatabase関数を実行
            const result = await createDatabase("test-db", {
                group: "production",
                enableExtensions: true,
                sizeLimit: "1GB",
                wait: true,
            });

            // オプションが正しく追加されることを検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith([
                "db",
                "create",
                "test-db",
                "--group",
                "production",
                "--enable-extensions",
                "--size-limit",
                "1GB",
                "--wait",
            ]);
        });

        it("fromFileオプション付きでデータベース作成コマンドを実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Database 'test-db' created from file",
            });

            // fromFileオプション付きでcreateDatabase関数を実行
            const result = await createDatabase("test-db", {
                fromFile: "/path/to/database.db",
                canary: true,
            });

            // オプションが正しく追加されることを検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith([
                "db",
                "create",
                "test-db",
                "--from-file",
                "/path/to/database.db",
                "--canary",
            ]);
        });
    });

    describe("destroyDatabase", () => {
        it("確認付きでデータベース削除コマンドを実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Database 'test-db' destroyed",
            });

            // destroyDatabase関数を実行
            const result = await destroyDatabase("test-db");

            // 結果を検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "destroy", "test-db"]);
        });

        it("確認スキップでデータベース削除コマンドを実行する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Database 'test-db' destroyed",
            });

            // 確認スキップでdestroyDatabase関数を実行
            const result = await destroyDatabase("test-db", true);

            // --yesオプションが追加されることを検証
            expect(result.success).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "destroy", "test-db", "--yes"]);
        });
    });

    describe("showDatabase", () => {
        it("データベース情報を正しく取得・パースする", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: `Name: test-db
URL: libsql://test.turso.io
HTTP URL: https://test.turso.io
Group: default
Locations: nrt, ord`,
            });

            // showDatabase関数を実行
            const result = await showDatabase("test-db");

            // 結果を検証
            expect(result.name).toBe("test-db");
            expect(result.url).toBe("libsql://test.turso.io");
            expect(result.httpUrl).toBe("https://test.turso.io");
            expect(result.group).toBe("default");
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "show", "test-db"]);
        });

        it("最小限の情報のみ含む出力を正しく処理する", async () => {
            // executeTursoCommandのモックを設定（最小限の情報）
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "Name: test-db",
            });

            // showDatabase関数を実行
            const result = await showDatabase("test-db");

            // 基本情報のみ設定されることを検証
            expect(result.name).toBe("test-db");
            expect(result.url).toBeUndefined();
            expect(result.httpUrl).toBeUndefined();
            expect(result.group).toBeUndefined();
        });
    });

    describe("getDatabaseUrl", () => {
        it("デフォルトURL（libsql://）を取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "libsql://test.turso.io",
            });

            // getDatabaseUrl関数を実行
            const result = await getDatabaseUrl("test-db");

            // 結果を検証
            expect(result).toBe("libsql://test.turso.io");
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "show", "test-db", "--url"]);
        });

        it("HTTP URLを取得する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "https://test.turso.io",
            });

            // HTTP URLを指定してgetDatabaseUrl関数を実行
            const result = await getDatabaseUrl("test-db", true);

            // 結果を検証
            expect(result).toBe("https://test.turso.io");
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "show", "test-db", "--http-url"]);
        });
    });

    describe("createDatabaseToken", () => {
        it("基本的なデータベーストークンを作成する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            });

            // createDatabaseToken関数を実行
            const result = await createDatabaseToken("test-db");

            // 結果を検証
            expect(result.token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
            expect(result.readOnly).toBeUndefined();
            expect(executeTursoCommand).toHaveBeenCalledWith(["db", "tokens", "create", "test-db"]);
        });

        it("オプション付きでデータベーストークンを作成する", async () => {
            // executeTursoCommandのモックを設定
            const { executeTursoCommand } = await import("../../../../src/utils/turso-cli/executor.js");
            vi.mocked(executeTursoCommand).mockResolvedValue({
                success: true,
                stdout: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            });

            // オプション付きでcreateDatabaseToken関数を実行
            const result = await createDatabaseToken("test-db", {
                expiration: "30d",
                readOnly: true,
            });

            // オプションが正しく追加され、結果が正しく設定されることを検証
            expect(result.token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
            expect(result.readOnly).toBe(true);
            expect(executeTursoCommand).toHaveBeenCalledWith([
                "db",
                "tokens",
                "create",
                "test-db",
                "--expiration",
                "30d",
                "--read-only",
            ]);
        });
    });
});

// EOF
