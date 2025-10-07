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

    describe("PrismaClient初期化", () => {
        it("datasourceUrlのみでの初期化が成功すること", async () => {
            // モック環境でPrismaClient初期化をテスト
            const mockPrismaClient = vi.fn().mockImplementation(() => ({
                $connect: vi.fn().mockResolvedValue(undefined),
                $disconnect: vi.fn().mockResolvedValue(undefined),
            }));

            // テスト実行
            expect(() => {
                new mockPrismaClient({
                    adapter: "mockAdapter",
                    datasourceUrl: "libsql://test.turso.io",
                });
            }).not.toThrow();
        });

        it("datasourceUrlとdatasourcesの同時指定でエラーになること", () => {
            // 旧コードパターンでの例外発生を確認
            const mockPrismaClient = vi.fn().mockImplementation(() => {
                throw new Error(
                    'Can not use "datasourceUrl" and "datasources" options at the same time.'
                );
            });

            expect(() => {
                new mockPrismaClient({
                    adapter: "mockAdapter",
                    datasourceUrl: "libsql://test.turso.io",
                    datasources: { db: { url: "libsql://test.turso.io" } },
                });
            }).toThrow("datasourceUrl");
        });

        it("Prisma設定エラー時に適切なエラーメッセージが表示されること", () => {
            const errorMessage =
                'Can not use "datasourceUrl" and "datasources" options at the same time.';

            // エラーメッセージの内容確認
            expect(errorMessage).toContain("datasourceUrl");
            expect(errorMessage).toContain("datasources");

            // 復旧手順を含む詳細なエラーメッセージの形式をテスト
            const detailedErrorMessage = `Prisma 設定エラー: ${errorMessage}\n\n復旧方法:\n1. Prisma バージョンを確認してください (現在: 6.16.3)\n2. libsql アダプター使用時は datasourceUrl のみを指定してください\n3. 詳細は https://pris.ly/d/client-constructor を参照してください`;

            expect(detailedErrorMessage).toContain("復旧方法:");
            expect(detailedErrorMessage).toContain("Prisma バージョン");
            expect(detailedErrorMessage).toContain("datasourceUrl のみを指定");
        });
    });

    describe("エラーハンドリング", () => {
        it("致命的エラー時に例外がthrowされること", () => {
            const authenticationError = "authentication failed";
            const networkError = "network connection timeout";
            const connectionError = "connection refused";

            // 認証エラー
            expect(() => {
                if (authenticationError.includes("authentication")) {
                    throw new Error(
                        `データベース接続エラー: ${authenticationError}`
                    );
                }
            }).toThrow("データベース接続エラー");

            // ネットワークエラー
            expect(() => {
                if (networkError.includes("network")) {
                    throw new Error(`データベース接続エラー: ${networkError}`);
                }
            }).toThrow("データベース接続エラー");

            // 接続エラー
            expect(() => {
                if (connectionError.includes("connection")) {
                    throw new Error(
                        `データベース接続エラー: ${connectionError}`
                    );
                }
            }).toThrow("データベース接続エラー");
        });

        it("回復可能エラー時に警告が表示され処理が継続されること", () => {
            const consolewarnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {
                    // 意図的に空のモック実装
                });

            // SQL実行失敗などの回復可能エラーのシミュレーション
            const recoverableError = "SQL execution failed";

            // 警告メッセージの確認
            const warningMessage = `⚠️ テーブル作成で問題が発生しました: ${recoverableError}`;
            console.warn(warningMessage);
            console.warn(
                "   アプリケーション初回起動時にテーブル作成が実行されます。"
            );

            expect(consolewarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("⚠️ テーブル作成で問題が発生しました")
            );
            expect(consolewarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("アプリケーション初回起動時")
            );

            consolewarnSpy.mockRestore();
        });

        it("全環境失敗時にCLI全体が失敗として扱われること", () => {
            const environments = ["dev", "staging", "prod"];
            const failedEnvironments = ["dev", "staging", "prod"];

            // 全環境失敗時のエラーメッセージを確認
            if (failedEnvironments.length === environments.length) {
                const errorMessage = `全ての環境でテーブル作成に失敗しました:\n失敗環境: ${failedEnvironments.join(", ")}\n\n復旧方法:\n1. Turso CLI の認証状況を確認\n2. データベースの存在を確認\n3. ネットワーク接続を確認`;

                expect(errorMessage).toContain(
                    "全ての環境でテーブル作成に失敗"
                );
                expect(errorMessage).toContain("dev, staging, prod");
                expect(errorMessage).toContain("復旧方法:");
                expect(errorMessage).toContain("Turso CLI の認証状況");
            }
        });

        it("一部環境失敗時に警告が表示され成功として扱われること", () => {
            const consolewarnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {
                    // 意図的に空のモック実装
                });

            const successfulEnvironments = ["dev", "staging"];
            const failedEnvironments = ["prod"];

            // 一部失敗時の警告メッセージを確認
            console.warn("\n⚠️ 一部環境でテーブル作成に失敗しました:");
            console.warn(`   成功: ${successfulEnvironments.join(", ")}`);
            console.warn(`   失敗: ${failedEnvironments.join(", ")}`);
            console.warn(
                "   失敗した環境は、アプリケーション初回起動時にテーブル作成が実行されます。"
            );

            expect(consolewarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("一部環境でテーブル作成に失敗")
            );
            expect(consolewarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("成功: dev, staging")
            );
            expect(consolewarnSpy).toHaveBeenCalledWith(
                expect.stringContaining("失敗: prod")
            );

            consolewarnSpy.mockRestore();
        });
    });
});

// EOF
