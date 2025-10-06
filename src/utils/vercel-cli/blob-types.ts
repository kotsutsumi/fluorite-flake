/**
 * Vercel Blob操作関連の型定義
 */

/**
 * Blobストア情報
 */
export type BlobStore = {
    /** ストアID */
    id: string;
    /** ストア名 */
    name: string;
    /** 作成日時 */
    createdAt: string;
    /** 最終更新日時 */
    updatedAt: string;
    /** リージョン */
    region?: string;
    /** ストアURL */
    url?: string;
};

/**
 * Blobストア作成オプション
 */
export type CreateBlobStoreOptions = {
    /** ストア名 */
    name: string;
    /** 読み書きトークン */
    token?: string;
    /** リージョン */
    region?: string;
};

/**
 * Blobストア作成結果
 */
export type BlobStoreResult = {
    /** 作成されたストア情報 */
    store: BlobStore;
    /** 生成されたトークン */
    token: string;
    /** 成功フラグ */
    success: boolean;
};

/**
 * Blobストア一覧取得オプション
 */
export type ListBlobStoresOptions = {
    /** アクセストークン */
    token?: string;
    /** 取得制限数 */
    limit?: number;
};

/**
 * Blobトークン検証結果
 */
export type TokenValidationResult = {
    /** 有効性フラグ */
    valid: boolean;
    /** エラーメッセージ */
    error?: string;
};

/**
 * Blob設定
 */
export type BlobConfiguration = {
    /** Blob使用フラグ */
    enabled: boolean;
    /** アクセストークン */
    token: string;
    /** ストアID */
    storeId: string;
    /** ストア名 */
    storeName: string;
};

/**
 * Blobエラーコード
 */
export const BlobErrorCode = {
    INVALID_TOKEN: "INVALID_TOKEN",
    STORE_NOT_FOUND: "STORE_NOT_FOUND",
    STORE_CREATION_FAILED: "STORE_CREATION_FAILED",
    CLI_NOT_AVAILABLE: "CLI_NOT_AVAILABLE",
    NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type BlobErrorCode = (typeof BlobErrorCode)[keyof typeof BlobErrorCode];

/**
 * Blob操作エラー
 */
export class BlobOperationError extends Error {
    code: BlobErrorCode;
    recoverable: boolean;

    constructor(message: string, code: BlobErrorCode, recoverable = true) {
        super(message);
        this.name = "BlobOperationError";
        this.code = code;
        this.recoverable = recoverable;
    }
}

// EOF
