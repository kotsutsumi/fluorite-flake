/**
 * Turso CLI プロビジョニング機能のテスト
 * URL解析とクエリパラメータ除去機能を重点的にテスト
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanDatabaseUrl } from "../../../../src/utils/turso-cli/provisioning.js";

describe("Turso CLI プロビジョニング機能", () => {
    // コンソール出力をモック化してテストログをクリーンに保つ
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // コンソール出力をテストログから除外
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("cleanDatabaseUrl", () => {
        it("クエリパラメータ付きのlibsql URLからベースURLを正しく抽出すること", () => {
            const input =
                "libsql://test-db.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9";
            const expected = "libsql://test-db.turso.io";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("複数のクエリパラメータを持つURLからベースURLを正しく抽出すること", () => {
            const input =
                "libsql://test-db.turso.io?authToken=token123&timeout=5000&retries=3";
            const expected = "libsql://test-db.turso.io";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("パス付きのURLからパスを保持してクエリパラメータのみを除去すること", () => {
            const input =
                "libsql://test-db.turso.io/path/to/db?authToken=token123";
            const expected = "libsql://test-db.turso.io/path/to/db";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("クエリパラメータがないURLはそのまま返すこと", () => {
            const input = "libsql://test-db.turso.io";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(input);
        });

        it("空文字列は空文字列をそのまま返すこと", () => {
            const input = "";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe("");
        });

        it("null値はnullをそのまま返すこと", () => {
            const input = null as unknown as string;

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(null);
        });

        it("undefined値はundefinedをそのまま返すこと", () => {
            const input = undefined as unknown as string;

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(undefined);
        });

        it("不正なURL形式の場合は元の文字列を返して警告を出力すること", () => {
            const input = "invalid-url-format";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(input);
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("⚠️ URL解析に失敗しました"),
                expect.any(Error)
            );
        });

        it("ポート番号付きのURLを正しく処理すること", () => {
            const input = "libsql://test-db.turso.io:8080?authToken=token123";
            const expected = "libsql://test-db.turso.io:8080";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("異なるプロトコルのURLも正しく処理すること", () => {
            const input =
                "https://api.turso.io/database?token=abc123&format=json";
            const expected = "https://api.turso.io/database";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("実際のTursoクラウドデータベースURLフォーマットを正しく処理すること", () => {
            const input =
                "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MDk2NzIzNjQsImlkIjoiNDFjZGI5M2UtZDEyNi00Mjk2LWJjOGMtNzQ2NDE2OWQzOTcyIn0.example";
            const expected =
                "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("フラグメント（#）付きのURLからフラグメントも除去すること", () => {
            const input =
                "libsql://test-db.turso.io?authToken=token123#fragment";
            const expected = "libsql://test-db.turso.io";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });

        it("IPアドレス形式のホストも正しく処理すること", () => {
            const input = "libsql://192.168.1.100:8080?authToken=token123";
            const expected = "libsql://192.168.1.100:8080";

            const result = cleanDatabaseUrl(input);

            expect(result).toBe(expected);
        });
    });

    describe("URL_INVALID エラーシナリオ再現テスト", () => {
        it("クエリパラメータ付きURLがlibsqlクライアントの初期化で問題を起こさないことを確認", () => {
            // 実際のユーザーエラーシナリオを模擬
            const problematicUrl =
                "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io?authToken=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9";
            const cleanedUrl = cleanDatabaseUrl(problematicUrl);

            // クリーンアップされたURLは有効なlibsql URL形式であることを確認
            expect(cleanedUrl).toBe(
                "libsql://test8-dev-kotsutsumi.aws-ap-northeast-1.turso.io"
            );
            expect(cleanedUrl).not.toContain("?");
            expect(cleanedUrl).not.toContain("authToken");
            expect(cleanedUrl).toMatch(/^libsql:\/\/[^?]+$/);
        });

        it("DATABASE_URL環境変数の典型的なフォーマットが正しく処理されることを確認", () => {
            const databaseUrlFormats = [
                "libsql://database.turso.io?authToken=token123",
                "libsql://database-staging.turso.io?authToken=different-token",
                "libsql://prod-db.aws-ap-northeast-1.turso.io?authToken=prod-token",
            ];

            const expectedCleanUrls = [
                "libsql://database.turso.io",
                "libsql://database-staging.turso.io",
                "libsql://prod-db.aws-ap-northeast-1.turso.io",
            ];

            databaseUrlFormats.forEach((url, index) => {
                const cleaned = cleanDatabaseUrl(url);
                expect(cleaned).toBe(expectedCleanUrls[index]);
                // libsqlクライアントが期待する形式であることを確認
                expect(cleaned).toMatch(/^libsql:\/\/[^?]+$/);
            });
        });
    });
});

// EOF
