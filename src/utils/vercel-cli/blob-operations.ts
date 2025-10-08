/**
 * Vercel Blob操作ユーティリティ
 */

import type {
    BlobStore,
    BlobStoreResult,
    BlobTokenResult,
    CreateBlobStoreOptions,
    CreateBlobTokenOptions,
    ListBlobStoresOptions,
    TokenValidationResult,
} from "./blob-types.js";
import { BlobErrorCode, BlobOperationError } from "./blob-types.js";
import { VercelCLI } from "./vercel-cli.js";

/**
 * Blob URL を正規化する
 * @param url 正規化するURL
 * @returns 正規化されたURL
 */
export function normalizeBlobUrl(url: string): string {
    if (!url) {
        return "";
    }

    // HTTPSプレフィックスを付与し、末尾のスラッシュを除去
    const cleanUrl = url.replace(/\/$/, "");

    if (cleanUrl.startsWith("https://")) {
        return cleanUrl;
    }

    if (cleanUrl.startsWith("http://")) {
        return cleanUrl.replace("http://", "https://");
    }

    return `https://${cleanUrl}`;
}

const CLI_NOT_FOUND_HINT = "Vercel CLI が見つかりません。`npm install -g vercel` などでインストールしてください。";
const CLI_AUTH_HINT =
    "Vercel CLI に認証されていないか、トークンが無効です。`vercel login` を実行し、正しい BLOB_READ_WRITE_TOKEN を使用してください。";
const CLI_NETWORK_HINT = "Vercel CLI と通信できませんでした。ネットワーク接続を確認してから再試行してください。";

function interpretVercelCliError(stderr: string | undefined): { code: BlobErrorCode; message: string } | null {
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
 * Blobトークンの有効性を検証する（非破壊的な方法）
 * @param token 検証するトークン
 * @returns 検証結果
 */
export async function validateBlobToken(token: string): Promise<TokenValidationResult> {
    // Vercel Blobトークンは `vercel_blob_rw_` または `blob_rw_` で始まる
    if (!(token.startsWith("vercel_blob_rw_") || token.startsWith("blob_rw_"))) {
        return { valid: false, error: "無効なトークン形式です" };
    }

    // Vercel Blobトークンの最小長を現実的な値に調整（約50文字以上）
    if (token.length < 50) {
        return { valid: false, error: "トークンが短すぎます" };
    }

    // 非破壊的な検証: Vercel API経由で既存ストア一覧を取得してトークンの有効性を確認
    try {
        const result = VercelCLI.execute("api /v2/blob/stores", {
            token,
        });

        if (result.success) {
            // APIが成功すればトークンは有効
            return { valid: true };
        }

        const interpreted = interpretVercelCliError(result.stderr);
        if (interpreted) {
            return { valid: false, error: interpreted.message };
        }

        return {
            valid: false,
            error: result.stderr?.trim() || "トークンの検証に失敗しました",
        };
    } catch (error) {
        return {
            valid: false,
            error: "トークンの検証中にエラーが発生しました",
        };
    }
}

/**
 * 新しいBlobストアを作成する
 * @param options 作成オプション
 * @returns 作成結果
 */
export async function createBlobStore(options: CreateBlobStoreOptions): Promise<BlobStoreResult> {
    const command = "blob store add";
    const args = [options.name];

    if (options.token) {
        args.push("--token", options.token);
    }

    if (options.region) {
        args.push("--region", options.region);
    }

    try {
        // Vercel CLI 48.2.1では --json フラグがサポートされていないため削除
        const result = VercelCLI.execute(`${command} ${args.join(" ")}`, {
            token: options.token,
        });

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(interpreted.message, interpreted.code);
            }

            throw new BlobOperationError(
                `Blobストアの作成に失敗しました: ${result.stderr?.trim() || "原因不明のエラー"}`,
                BlobErrorCode.STORE_CREATION_FAILED
            );
        }

        // Vercel CLI 48.2.1では出力が人間可読形式なのでパース処理を変更
        if (!result.stdout) {
            throw new BlobOperationError(
                "Blobストア作成結果の解析に失敗しました。",
                BlobErrorCode.STORE_CREATION_FAILED
            );
        }

        // 人間可読形式の出力からストア情報を抽出
        // 例: "Success! Blob store created: test-store (store_abc123) in iad1"
        const storeMatch = result.stdout.match(/Success! Blob store created: ([^\s]+) \(([^)]+)\) in ([^\s]+)/);
        if (!storeMatch) {
            throw new BlobOperationError(
                "Blobストア作成結果の解析に失敗しました。出力形式が予期されたものと異なります。",
                BlobErrorCode.STORE_CREATION_FAILED
            );
        }

        const [, storeName, storeId, region] = storeMatch;
        const now = new Date().toISOString();

        let finalToken = options.token || "";

        // トークンが提供されていない場合、自動でトークンを作成
        if (!finalToken) {
            try {
                console.log(`🔑 ストア用のトークンを自動生成中: ${storeId}`);
                const tokenResult = await createBlobToken({
                    storeId,
                    scope: "read_write",
                    tokenType: "user",
                });

                if (tokenResult.success) {
                    finalToken = tokenResult.token;
                    console.log(`✅ トークン自動生成完了: ${tokenResult.tokenId}`);
                } else {
                    console.warn("⚠️ トークン自動生成に失敗しました");
                }
            } catch (tokenError) {
                console.warn("⚠️ トークン自動生成でエラーが発生しました:", tokenError);
                // トークン生成失敗は致命的ではないのでログに記録して続行
            }
        }

        return {
            store: {
                id: storeId,
                name: storeName,
                createdAt: now,
                updatedAt: now,
                region,
                url: normalizeBlobUrl(`https://${storeId}.blob.vercel.app`),
            },
            token: finalToken,
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
export async function listBlobStores(options: ListBlobStoresOptions = {}): Promise<BlobStore[]> {
    try {
        // BLOB_READ_WRITE_TOKENが明示的に提供されていない場合は認証エラーとする
        if (!options.token) {
            console.log("🔍 BLOB_READ_WRITE_TOKENが提供されていません");
            throw new BlobOperationError(
                "BLOB_READ_WRITE_TOKEN が必要です。Vercel CLI にログインしているか、明示的にトークンを提供してください。",
                BlobErrorCode.INVALID_TOKEN
            );
        }

        // Vercel API経由でストア一覧を取得
        const result = VercelCLI.execute("api /v2/blob/stores", {
            token: options.token,
        });

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(interpreted.message, interpreted.code);
            }

            throw new BlobOperationError(
                `Blobストア一覧の取得に失敗しました: ${result.stderr?.trim() || "原因不明のエラー"}`,
                BlobErrorCode.API_ERROR
            );
        }

        if (!result.stdout) {
            return [];
        }

        try {
            const apiResponse = JSON.parse(result.stdout);

            // APIレスポンスの構造に応じて処理
            const stores = apiResponse.stores || apiResponse.data || [];

            return stores.map((store: any) => ({
                id: store.id,
                name: store.name,
                createdAt: store.createdAt || store.created_at || new Date().toISOString(),
                updatedAt: store.updatedAt || store.updated_at || new Date().toISOString(),
                region: store.region || "iad1",
                url: normalizeBlobUrl(store.url || `https://${store.id}.blob.vercel.app`),
            }));
        } catch (parseError) {
            console.warn("Warning: blob store list のJSONパースに失敗、空配列を返します");
            return [];
        }
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
 * Blobトークンを作成する
 * @param options トークン作成オプション
 * @returns トークン作成結果
 */
export async function createBlobToken(options: CreateBlobTokenOptions): Promise<BlobTokenResult> {
    try {
        // Vercel APIを使用してトークンを発行
        const scope = options.scope || "read_write";
        const tokenType = options.tokenType || "user";

        // Vercel API経由でトークンを作成
        const apiPayload = {
            storeId: options.storeId,
            scope,
            type: tokenType,
            ...(options.expiresIn && { expiresIn: options.expiresIn }),
        };

        const result = VercelCLI.execute(
            `api /v2/blob/stores/${options.storeId}/tokens -X POST -d '${JSON.stringify(apiPayload)}'`
        );

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(interpreted.message, interpreted.code);
            }

            throw new BlobOperationError(
                `Blobトークンの作成に失敗しました: ${result.stderr?.trim() || "原因不明のエラー"}`,
                BlobErrorCode.TOKEN_CREATION_FAILED
            );
        }

        if (!result.stdout) {
            throw new BlobOperationError(
                "Blobトークン作成結果の解析に失敗しました。",
                BlobErrorCode.TOKEN_CREATION_FAILED
            );
        }

        try {
            const apiResponse = JSON.parse(result.stdout);

            return {
                token: apiResponse.token,
                tokenId: apiResponse.id || apiResponse.tokenId,
                scope: apiResponse.scope || scope,
                expiresAt: apiResponse.expiresAt || apiResponse.expires_at,
                success: true,
            };
        } catch (parseError) {
            throw new BlobOperationError(
                "Blobトークン作成結果のJSONパースに失敗しました。",
                BlobErrorCode.TOKEN_CREATION_FAILED
            );
        }
    } catch (error) {
        if (error instanceof BlobOperationError) {
            throw error;
        }
        throw new BlobOperationError(
            `Blob token creation failed: ${error instanceof Error ? error.message : error}`,
            BlobErrorCode.TOKEN_CREATION_FAILED
        );
    }
}

/**
 * Blobストアの詳細情報を取得する
 * @param storeId ストアID
 * @param token アクセストークン
 * @returns ストア情報
 */
export async function getBlobStore(storeId: string, token?: string): Promise<BlobStore> {
    try {
        // Vercel CLI 48.2.1では --json フラグがサポートされていないため削除
        const result = VercelCLI.execute(`blob store get ${storeId}`, {
            token,
        });

        if (!result.success) {
            const interpreted = interpretVercelCliError(result.stderr);
            if (interpreted) {
                throw new BlobOperationError(interpreted.message, interpreted.code);
            }

            throw new BlobOperationError(
                `Blobストア '${storeId}' を取得できませんでした: ${result.stderr?.trim() || "原因不明のエラー"}`,
                BlobErrorCode.STORE_NOT_FOUND
            );
        }

        if (!result.stdout) {
            throw new BlobOperationError("Blobストア情報の解析に失敗しました。", BlobErrorCode.STORE_NOT_FOUND);
        }

        // 人間可読形式の出力をパース
        // 例:
        // Blob Store: test-store (store_abc123)
        // Billing State: Active
        // Size: 0B
        // Region: iad1
        // Created At: 10/07/2025 07:04:10.16
        // Updated At: 10/07/2025 07:04:10.16
        const lines = result.stdout.split("\n");
        const storeInfo: any = {};

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("Blob Store:")) {
                const storeMatch = trimmed.match(/Blob Store: ([^\s]+) \(([^)]+)\)/);
                if (storeMatch) {
                    storeInfo.name = storeMatch[1];
                    storeInfo.id = storeMatch[2];
                }
            } else if (trimmed.startsWith("Region:")) {
                storeInfo.region = trimmed.replace("Region:", "").trim();
            } else if (trimmed.startsWith("Created At:")) {
                storeInfo.createdAt = trimmed.replace("Created At:", "").trim();
            } else if (trimmed.startsWith("Updated At:")) {
                storeInfo.updatedAt = trimmed.replace("Updated At:", "").trim();
            }
        }

        if (!(storeInfo.id && storeInfo.name)) {
            throw new BlobOperationError(
                "Blobストア情報の解析に失敗しました。必要な情報が見つかりません。",
                BlobErrorCode.STORE_NOT_FOUND
            );
        }

        return {
            id: storeInfo.id,
            name: storeInfo.name,
            createdAt: storeInfo.createdAt || new Date().toISOString(),
            updatedAt: storeInfo.updatedAt || new Date().toISOString(),
            region: storeInfo.region || "iad1",
            url: normalizeBlobUrl(`https://${storeInfo.id}.blob.vercel.app`),
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
export function generateUniqueStoreName(baseName: string, existingStores: BlobStore[]): string {
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
        let candidateBase = normalizedBase.slice(0, baseLength).replace(/-+$/, "");
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
