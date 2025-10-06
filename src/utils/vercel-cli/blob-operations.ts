/**
 * Vercel Blob操作ユーティリティ
 */

import type {
    BlobStore,
    BlobStoreResult,
    CreateBlobStoreOptions,
    ListBlobStoresOptions,
    TokenValidationResult,
} from "./blob-types.js";
import { BlobErrorCode, BlobOperationError } from "./blob-types.js";
import { VercelCLI } from "./vercel-cli.js";

const CLI_NOT_FOUND_HINT =
    "Vercel CLI が見つかりません。`npm install -g vercel` などでインストールしてください。";
const CLI_AUTH_HINT =
    "Vercel CLI に認証されていないか、トークンが無効です。`vercel login` を実行し、正しい BLOB_READ_WRITE_TOKEN を使用してください。";
const CLI_NETWORK_HINT =
    "Vercel CLI と通信できませんでした。ネットワーク接続を確認してから再試行してください。";

function interpretVercelCliError(
    stderr: string | undefined
): { code: BlobErrorCode; message: string } | null {
    if (!stderr) {
        return null;
    }

    const normalized = stderr.toLowerCase();

    if (
        normalized.includes("command not found") ||
        normalized.includes("enoent") ||
        normalized.includes("no such file or directory")
    ) {
        return {
            code: BlobErrorCode.CLI_NOT_AVAILABLE,
            message: CLI_NOT_FOUND_HINT,
        };
    }

    if (
        normalized.includes("unauthorized") ||
        normalized.includes("not authenticated") ||
        normalized.includes("not logged in") ||
        normalized.includes("please run `vercel login`") ||
        normalized.includes("token is invalid") ||
        normalized.includes("invalid token")
    ) {
        return {
            code: BlobErrorCode.INVALID_TOKEN,
            message: CLI_AUTH_HINT,
        };
    }

    if (normalized.includes("network") || normalized.includes("etimedout")) {
        return {
            code: BlobErrorCode.NETWORK_ERROR,
            message: CLI_NETWORK_HINT,
        };
    }

    return null;
}
/**
 * Blobトークンの有効性を検証する
 * @param token 検証するトークン
 * @returns 検証結果
 */
export async function validateBlobToken(
    token: string
): Promise<TokenValidationResult> {
    if (!token.startsWith("blob_rw_")) {
        return { valid: false, error: "無効なトークン形式です" };
    }

    if (token.length < 64) {
        return { valid: false, error: "トークンが短すぎます" };
    }

    const result = VercelCLI.execute("blob store list --json", {
        token,
    });

    if (result.success) {
        return { valid: true };
    }

    const interpreted = interpretVercelCliError(result.stderr);
    if (interpreted) {
        return { valid: false, error: interpreted.message };
    }

    return {
        valid: false,
        error:
            result.stderr?.trim() ||
            "Blobトークンの検証に失敗しました。もう一度お試しください。",
    };
}

/**
 * 新しいBlobストアを作成する
 * @param options 作成オプション
 * @returns 作成結果
 */
export async function createBlobStore(
    options: CreateBlobStoreOptions
): Promise<BlobStoreResult> {
    const command = "blob store add";
    const args = [options.name];

    if (options.token) {
        args.push("--token", options.token);
    }

    if (options.region) {
        args.push("--region", options.region);
    }

    try {
        const result = VercelCLI.execute(
            `${command} ${args.join(" ")} --json`,
            {
                token: options.token,
            }
        );

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(
                    interpreted.message,
                    interpreted.code
                );
            }

            throw new BlobOperationError(
                `Blobストアの作成に失敗しました: ${
                    result.stderr?.trim() || "原因不明のエラー"
                }`,
                BlobErrorCode.STORE_CREATION_FAILED
            );
        }

        if (!result.stdout) {
            throw new BlobOperationError(
                "Blobストア作成結果の解析に失敗しました。",
                BlobErrorCode.STORE_CREATION_FAILED
            );
        }

        const storeData = JSON.parse(result.stdout);
        return {
            store: {
                id: storeData.id,
                name: storeData.name,
                createdAt: storeData.createdAt,
                updatedAt: storeData.updatedAt,
                region: storeData.region,
                url: storeData.url,
            },
            token: storeData.token || options.token || "",
            success: true,
        };
    } catch (error) {
        if (error instanceof BlobOperationError) {
            throw error;
        }
        throw new BlobOperationError(
            `Blob store creation failed: ${error instanceof Error ? error.message : error}`,
            BlobErrorCode.STORE_CREATION_FAILED
        );
    }
}

/**
 * Blobストア一覧を取得する
 * @param options 取得オプション
 * @returns ストア一覧
 */
export async function listBlobStores(
    options: ListBlobStoresOptions = {}
): Promise<BlobStore[]> {
    try {
        const args = ["blob", "store", "list", "--json"];

        if (options.limit) {
            args.push("--limit", options.limit.toString());
        }

        const result = VercelCLI.execute(args.join(" "), {
            token: options.token,
        });

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(
                    interpreted.message,
                    interpreted.code
                );
            }

            throw new BlobOperationError(
                `Blobストア一覧の取得に失敗しました: ${
                    result.stderr?.trim() || "原因不明のエラー"
                }`,
                BlobErrorCode.NETWORK_ERROR
            );
        }

        if (!result.stdout) {
            return [];
        }

        const storesData = JSON.parse(result.stdout);
        return storesData.map((store: any) => ({
            id: store.id,
            name: store.name,
            createdAt: store.createdAt,
            updatedAt: store.updatedAt,
            region: store.region,
            url: store.url,
        }));
    } catch (error) {
        if (error instanceof BlobOperationError) {
            throw error;
        }
        throw new BlobOperationError(
            `Failed to list blob stores: ${error instanceof Error ? error.message : error}`,
            BlobErrorCode.NETWORK_ERROR
        );
    }
}

/**
 * Blobストアの詳細情報を取得する
 * @param storeId ストアID
 * @param token アクセストークン
 * @returns ストア情報
 */
export async function getBlobStore(
    storeId: string,
    token?: string
): Promise<BlobStore> {
    try {
        const result = VercelCLI.execute(`blob store get ${storeId} --json`, {
            token,
        });

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(
                    interpreted.message,
                    interpreted.code
                );
            }

            throw new BlobOperationError(
                `Blobストア '${storeId}' を取得できませんでした: ${
                    result.stderr?.trim() || "原因不明のエラー"
                }`,
                BlobErrorCode.STORE_NOT_FOUND
            );
        }

        if (!result.stdout) {
            throw new BlobOperationError(
                "Blobストア情報の解析に失敗しました。",
                BlobErrorCode.STORE_NOT_FOUND
            );
        }

        const storeData = JSON.parse(result.stdout);
        return {
            id: storeData.id,
            name: storeData.name,
            createdAt: storeData.createdAt,
            updatedAt: storeData.updatedAt,
            region: storeData.region,
            url: storeData.url,
        };
    } catch (error) {
        if (error instanceof BlobOperationError) {
            throw error;
        }
        throw new BlobOperationError(
            `Failed to get blob store: ${error instanceof Error ? error.message : error}`,
            BlobErrorCode.STORE_NOT_FOUND
        );
    }
}

/**
 * Blobストア名の衝突を回避した名前を生成する
 * @param baseName 基本名
 * @param existingStores 既存ストア一覧
 * @returns 衝突回避された名前
 */
export function generateUniqueStoreName(
    baseName: string,
    existingStores: BlobStore[]
): string {
    const existingNames = existingStores.map((store) => store.name);
    const maxLength = 32;

    const normalizedBase = baseName.slice(0, maxLength);
    if (!existingNames.includes(normalizedBase)) {
        return normalizedBase;
    }

    let counter = 2;
    while (true) {
        const suffix = `-${counter}`;
        const baseLength = Math.max(1, maxLength - suffix.length);
        let candidateBase = normalizedBase
            .slice(0, baseLength)
            .replace(/-+$/, "");
        if (!candidateBase) {
            candidateBase = normalizedBase.slice(0, baseLength);
        }

        const candidate = `${candidateBase}${suffix}`;
        if (!existingNames.includes(candidate)) {
            return candidate;
        }

        counter++;
    }
}

/**
 * プロジェクト名からBlobストア名を生成する
 * @param projectName プロジェクト名
 * @returns サニタイズされたストア名
 */
export function generateBlobStoreName(projectName: string): string {
    const suffix = "-blob";
    const maxLength = 32 - suffix.length;

    let sanitized = projectName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    if (!sanitized) {
        sanitized = "app";
    }

    let base = sanitized.slice(0, Math.max(1, maxLength)).replace(/-+$/, "");
    if (!base) {
        base = sanitized.slice(0, Math.max(1, maxLength));
    }

    const storeName = `${base}${suffix}`;
    if (storeName.length <= 32) {
        return storeName;
    }

    const trimmedBase =
        base.slice(0, Math.max(1, 32 - suffix.length)).replace(/-+$/, "") ||
        base.slice(0, Math.max(1, 32 - suffix.length));

    const fallbackBase = trimmedBase || "app";
    return `${fallbackBase}${suffix}`;
}

// EOF
