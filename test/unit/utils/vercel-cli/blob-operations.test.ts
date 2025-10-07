/**
 * Vercel Blob操作ユーティリティのテスト
 */

import { describe, expect, it, vi } from "vitest";
import {
    createBlobStore,
    createBlobToken,
    listBlobStores,
    validateBlobToken,
} from "../../../../src/utils/vercel-cli/blob-operations.js";
import {
    BlobErrorCode,
    BlobOperationError,
} from "../../../../src/utils/vercel-cli/blob-types.js";

// VercelCLIモジュールをモック化
vi.mock("../../../../src/utils/vercel-cli/vercel-cli.js", () => ({
    VercelCLI: {
        execute: vi.fn(),
    },
}));

const mockVercelCLI = await import(
    "../../../../src/utils/vercel-cli/vercel-cli.js"
);

describe("createBlobToken", () => {
    it("正常なAPIレスポンスでトークンを作成する", async () => {
        // APIレスポンスをモック
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: true,
            stdout: JSON.stringify({
                token: "blob_rw_test_token_12345",
                id: "token_id_123",
                scope: "read_write",
                expiresAt: "2024-12-31T23:59:59Z",
            }),
            stderr: undefined,
        });

        const result = await createBlobToken({
            storeId: "store_123",
            scope: "read_write",
        });

        expect(result.success).toBe(true);
        expect(result.token).toBe("blob_rw_test_token_12345");
        expect(result.tokenId).toBe("token_id_123");
        expect(result.scope).toBe("read_write");
        expect(result.expiresAt).toBe("2024-12-31T23:59:59Z");
    });

    it("API呼び出し失敗時にエラーを投げる", async () => {
        // API失敗をモック
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: false,
            stdout: undefined,
            stderr: "Unauthorized",
        });

        await expect(
            createBlobToken({
                storeId: "store_123",
                scope: "read_write",
            })
        ).rejects.toThrow(BlobOperationError);
    });

    it("JSONパース失敗時にエラーを投げる", async () => {
        // 無効なJSONレスポンスをモック
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: true,
            stdout: "invalid json",
            stderr: undefined,
        });

        await expect(
            createBlobToken({
                storeId: "store_123",
                scope: "read_write",
            })
        ).rejects.toThrow(BlobOperationError);
    });
});

describe("listBlobStores", () => {
    it("正常なAPIレスポンスでストア一覧を取得する", async () => {
        // APIレスポンスをモック
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: true,
            stdout: JSON.stringify({
                stores: [
                    {
                        id: "store_123",
                        name: "test-store",
                        createdAt: "2024-01-01T00:00:00Z",
                        updatedAt: "2024-01-01T00:00:00Z",
                        region: "iad1",
                        url: "https://store_123.blob.vercel.app",
                    },
                ],
            }),
            stderr: undefined,
        });

        const result = await listBlobStores({ token: "blob_rw_test_token" });

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("store_123");
        expect(result[0].name).toBe("test-store");
    });

    it("トークンが提供されていない場合にエラーを投げる", async () => {
        await expect(listBlobStores()).rejects.toThrow(BlobOperationError);

        const error = await listBlobStores().catch((err) => err);
        expect(error.code).toBe(BlobErrorCode.INVALID_TOKEN);
    });

    it("API失敗時にエラーを投げる", async () => {
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: false,
            stdout: undefined,
            stderr: "Network error",
        });

        await expect(
            listBlobStores({ token: "blob_rw_test_token" })
        ).rejects.toThrow(BlobOperationError);
    });
});

describe("createBlobStore", () => {
    it("正常なストア作成でトークンを自動生成する", async () => {
        // ストア作成の成功をモック
        vi.mocked(mockVercelCLI.VercelCLI.execute)
            .mockReturnValueOnce({
                success: true,
                stdout: "Success! Blob store created: test-store (store_abc123) in iad1",
                stderr: undefined,
            })
            // createBlobTokenの成功をモック
            .mockReturnValueOnce({
                success: true,
                stdout: JSON.stringify({
                    token: "blob_rw_auto_generated_token",
                    id: "token_auto_123",
                    scope: "read_write",
                }),
                stderr: undefined,
            });

        const result = await createBlobStore({
            name: "test-store",
        });

        expect(result.success).toBe(true);
        expect(result.store.id).toBe("store_abc123");
        expect(result.store.name).toBe("test-store");
        expect(result.token).toBe("blob_rw_auto_generated_token");
    });

    it("トークンが提供されている場合は自動生成を行わない", async () => {
        // mockをリセット
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockClear();

        // ストア作成の成功をモック
        vi.mocked(mockVercelCLI.VercelCLI.execute).mockReturnValue({
            success: true,
            stdout: "Success! Blob store created: test-store (store_abc123) in iad1",
            stderr: undefined,
        });

        const result = await createBlobStore({
            name: "test-store",
            token: "existing_token",
        });

        expect(result.success).toBe(true);
        expect(result.token).toBe("existing_token");
        // createBlobTokenが呼ばれないことを確認（1回のみの呼び出し）
        expect(mockVercelCLI.VercelCLI.execute).toHaveBeenCalledTimes(1);
    });
});

describe("validateBlobToken", () => {
    it("有効なトークン形式を受け入れる - vercel_blob_rw_形式", async () => {
        // トークン検証の成功をモック
        vi.mocked(mockVercelCLI.VercelCLI.execute)
            .mockReturnValueOnce({
                success: true,
                stdout: "Success! Blob store created: test-token-validation (store_test123) in iad1",
                stderr: undefined,
            })
            // ストア削除の成功をモック
            .mockReturnValueOnce({
                success: true,
                stdout: "Success! Blob store removed",
                stderr: undefined,
            });

        const result = await validateBlobToken(
            "vercel_blob_rw_valid_token_12345678901234567890123456789012345678901234567890"
        );

        expect(result.valid).toBe(true);
    });

    it("有効なトークン形式を受け入れる - blob_rw_形式", async () => {
        // トークン検証の成功をモック
        vi.mocked(mockVercelCLI.VercelCLI.execute)
            .mockReturnValueOnce({
                success: true,
                stdout: "Success! Blob store created: test-token-validation (store_test123) in iad1",
                stderr: undefined,
            })
            // ストア削除の成功をモック
            .mockReturnValueOnce({
                success: true,
                stdout: "Success! Blob store removed",
                stderr: undefined,
            });

        const result = await validateBlobToken(
            "blob_rw_valid_token_12345678901234567890123456789012345678901234567890"
        );

        expect(result.valid).toBe(true);
    });

    it("無効なトークン形式を拒否する", async () => {
        const result = await validateBlobToken("invalid_token");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("無効なトークン形式です");
    });

    it("短すぎるトークンを拒否する", async () => {
        const result = await validateBlobToken("vercel_blob_rw_short");

        expect(result.valid).toBe(false);
        expect(result.error).toBe("トークンが短すぎます");
    });
});

// EOF
