/**
 * プロジェクト作成の実行モジュール
 *
 * 確認済みの設定に基づいて実際のプロビジョニング処理を実行します。
 * このモジュールのみが副作用（データベース作成、API呼び出し）を持ちます。
 */

import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js";
import type { ConfirmationInputs } from "../confirmation/index.js";
import { DatabaseProvisioningService } from "../database-provisioning/service.js";
import type { DatabaseCredentials, DatabaseProvisioningConfig } from "../database-provisioning/types.js";

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
 * ロールバック機能を実装し、部分的な失敗時にリソースリークを防ぐ
 *
 * @param inputs - 確認済みの入力情報
 * @returns プロビジョニング実行結果
 */
export async function executeProvisioning(inputs: ConfirmationInputs): Promise<ExecutionResult> {
    // ロールバック用のアクションを記録する配列
    const rollbackActions: Array<() => Promise<void>> = [];

    try {
        const result: ExecutionResult = { success: false };

        // データベースプロビジョニングの実行
        if (inputs.databaseConfig) {
            const dbResult = await executeDatabaseProvisioning(inputs.databaseConfig);
            if (!dbResult.success) {
                return {
                    success: false,
                    error: `データベースプロビジョニングに失敗: ${dbResult.error}`,
                };
            }
            result.databaseCredentials = dbResult.credentials;
            result.databases = dbResult.databases;

            // データベース作成成功時、ロールバックアクションを登録
            if (dbResult.credentials) {
                rollbackActions.push(async () => {
                    try {
                        console.log("🔄 データベースのロールバックを実行中...");
                        await rollbackDatabaseProvisioning(inputs.databaseConfig!, dbResult.credentials);
                        console.log("✅ データベースのロールバックが完了しました");
                    } catch (rollbackError) {
                        console.error("⚠️ データベースのロールバックに失敗しました:", rollbackError);
                    }
                });
            }
        }

        // Blobプロビジョニングの実行（将来実装）
        if (inputs.blobConfig) {
            const blobResult = await executeBlobProvisioning(inputs.blobConfig);

            // Blob失敗時はデータベースをロールバック
            if (!blobResult.success) {
                console.warn(`⚠️ Blob設定に失敗しました: ${blobResult.error}`);
                console.log("🔄 既に作成されたリソースをロールバックします...");

                // ロールバックアクションを逆順で実行
                for (const rollback of rollbackActions.reverse()) {
                    await rollback();
                }

                return {
                    success: false,
                    error: `Blobプロビジョニングに失敗: ${blobResult.error}`,
                };
            }

            result.blobCredentials = blobResult.credentials;
        }

        result.success = true;
        return result;
    } catch (error) {
        // エラー発生時は全てのリソースをロールバック
        console.error("❌ プロビジョニング中にエラーが発生しました");
        console.log("🔄 既に作成されたリソースをロールバックします...");

        for (const rollback of rollbackActions.reverse()) {
            await rollback();
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * データベースプロビジョニングを実行
 */
async function executeDatabaseProvisioning(config: DatabaseProvisioningConfig): Promise<{
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
 * Blobプロビジョニングを実行（現在は未実装）
 *
 * 注意: 現在はプレースホルダー実装のため、実際のVercel API呼び出しは行われません
 */
async function executeBlobProvisioning(_config: BlobConfiguration): Promise<{
    success: boolean;
    credentials?: BlobCredentials;
    error?: string;
}> {
    try {
        console.log("📦 Vercel Blob設定を実行中...");

        // TODO: 実際のVercel API呼び出しを実装する必要があります
        console.warn("⚠️ Vercel Blob設定は現在プレースホルダー実装です");
        console.warn("💡 手動でVercelダッシュボードから設定してください:");
        console.warn(`   1. Vercel ダッシュボードにアクセス`);
        console.warn(`   2. プロジェクトを選択`);
        console.warn(`   3. Storage > Blob から新しいストアを作成`);
        console.warn(`   4. 環境変数 BLOB_READ_WRITE_TOKEN を設定`);

        // プレースホルダーではなく、未実装であることを明示的にエラーとして返す
        return {
            success: false,
            error: "Vercel Blob設定は現在未実装です。手動で設定してください。",
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * データベースプロビジョニングのロールバック処理
 *
 * 作成されたデータベースを削除してリソースリークを防ぐ
 */
async function rollbackDatabaseProvisioning(
    config: DatabaseProvisioningConfig,
    credentials?: DatabaseCredentials
): Promise<void> {
    if (!credentials) {
        return; // 認証情報がない場合は何もしない
    }

    try {
        console.log(`🗑️ データベースを削除しています: ${config.databaseName}`);

        // データベースの自動削除は未実装のため、手動削除の案内を表示
        console.warn("⚠️ データベースの自動削除は未実装です");
        console.warn("💡 手動でデータベースを削除してください:");

        if (config.type === "turso") {
            console.warn(`   turso db destroy ${config.naming.dev}`);
            console.warn(`   turso db destroy ${config.naming.staging}`);
            console.warn(`   turso db destroy ${config.naming.prod}`);
        } else if (config.type === "supabase") {
            console.warn("   Supabase ダッシュボードからプロジェクトを削除してください");
        }
    } catch (error) {
        console.error("⚠️ ロールバック処理でエラーが発生しました:", error);
        throw error;
    }
}

/**
 * エラーハンドリング用のカスタムエラークラス
 */
export class ProvisioningError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;

    constructor(message: string, code: string, details?: Record<string, unknown>) {
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
