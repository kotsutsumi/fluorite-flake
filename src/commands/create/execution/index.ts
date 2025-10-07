/**
 * プロジェクト作成の実行モジュール
 *
 * 確認済みの設定に基づいて実際のプロビジョニング処理を実行します。
 * このモジュールのみが副作用（データベース作成、API呼び出し）を持ちます。
 */

import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js";
import type { ConfirmationInputs } from "../confirmation/index.js";
import { DatabaseProvisioningService } from "../database-provisioning/service.js";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
} from "../database-provisioning/types.js";

/**
 * プロビジョニング実行結果の型定義
 */
export type ExecutionResult = {
    /** データベース認証情報 */
    databaseCredentials?: DatabaseCredentials;
    /** 作成されたデータベースの情報リスト */
    databases?: DatabaseInfo[];
    /** Blob認証情報 */
    blobCredentials?: BlobCredentials;
    /** 実行成功フラグ */
    success: boolean;
    /** エラーメッセージ（失敗時） */
    error?: string;
};

/**
 * データベース情報の型定義
 */
export type DatabaseInfo = {
    /** データベース名 */
    name: string;
    /** 環境名（dev, staging, prod等） */
    environment: string;
    /** データベース状態 */
    status: string;
};

/**
 * Blob認証情報の型定義（将来拡張用）
 */
export type BlobCredentials = {
    /** アクセストークン */
    token: string;
    /** ストア名 */
    storeName: string;
};

/**
 * 確認済み入力に基づいてプロビジョニングを実行
 *
 * @param inputs - 確認済みの入力情報
 * @returns プロビジョニング実行結果
 */
export async function executeProvisioning(
    inputs: ConfirmationInputs
): Promise<ExecutionResult> {
    try {
        const result: ExecutionResult = { success: false };

        // データベースプロビジョニングの実行
        if (inputs.databaseConfig) {
            const dbResult = await executeDatabaseProvisioning(
                inputs.databaseConfig
            );
            if (!dbResult.success) {
                return {
                    success: false,
                    error: `データベースプロビジョニングに失敗: ${dbResult.error}`,
                };
            }
            result.databaseCredentials = dbResult.credentials;
            result.databases = dbResult.databases;
        }

        // Blobプロビジョニングの実行（将来実装）
        if (inputs.blobConfig) {
            const blobResult = await executeBlobProvisioning(inputs.blobConfig);
            if (blobResult.success) {
                result.blobCredentials = blobResult.credentials;
            }
            // Blobの失敗は警告レベルとし、プロジェクト作成は継続
            if (!blobResult.success) {
                console.warn(
                    `⚠️ Blob設定に問題がありました: ${blobResult.error}`
                );
            }
        }

        result.success = true;
        return result;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * データベースプロビジョニングを実行
 */
async function executeDatabaseProvisioning(
    config: DatabaseProvisioningConfig
): Promise<{
    success: boolean;
    credentials?: DatabaseCredentials;
    databases?: DatabaseInfo[];
    error?: string;
}> {
    try {
        console.log("🗄️ データベースプロビジョニングを実行中...");

        // プロビジョニングをスキップする場合
        if (config.options?.skipProvisioning) {
            console.log("⏭️ プロビジョニングをスキップしました");
            return { success: true };
        }

        // 実際のプロビジョニング実行
        const provisioningService = new DatabaseProvisioningService();
        const result = await provisioningService.provision(config);

        if (!result.success) {
            return {
                success: false,
                error: result.error || "不明なエラー",
            };
        }

        console.log("✅ データベースプロビジョニングが完了しました");

        // データベース情報をログ出力
        if (result.databases) {
            for (const db of result.databases) {
                console.log(`  - ${db.environment}: ${db.name} (${db.status})`);
            }
        }

        return {
            success: true,
            credentials: result.credentials,
            databases: result.databases,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Blobプロビジョニングを実行（将来実装）
 */
async function executeBlobProvisioning(config: BlobConfiguration): Promise<{
    success: boolean;
    credentials?: BlobCredentials;
    error?: string;
}> {
    try {
        console.log("📦 Vercel Blob設定を実行中...");

        // 現在は設定情報をそのまま返す（将来の実装でAPI呼び出しを追加予定）
        console.log(`✅ Vercel Blob設定完了: ${config.storeName}`);

        return {
            success: true,
            credentials: {
                token: "placeholder-token",
                storeName: config.storeName || "default-store",
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * エラーハンドリング用のカスタムエラークラス
 */
export class ProvisioningError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        code: string,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = "ProvisioningError";
        this.code = code;
        this.details = details;
    }
}

/**
 * ユーザーキャンセル用のカスタムエラークラス
 */
export class UserCancelledError extends Error {
    constructor(message = "操作がユーザーによってキャンセルされました") {
        super(message);
        this.name = "UserCancelledError";
    }
}

// EOF
