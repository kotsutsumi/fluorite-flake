/**
 * データベースおよびBlobストレージ設定の収集ロジックを提供する
 */
import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js"; // Vercel Blob構成の型定義を読み込む
import { UserCancelledError } from "../execution/index.js"; // ユーザーキャンセルエラーをインポート
import { collectDatabaseConfig } from "../database-provisioning/prompts.js"; // データベース設定を対話的に取得する関数をインポートする
import type { DatabaseProvisioningConfig } from "../database-provisioning/types.js"; // データベースプロビジョニング設定の型を取り込む
import { collectBlobConfiguration } from "../prompts/blob-prompts.js"; // Blob設定を収集するユーティリティを読み込む
import type { DatabaseType } from "../types.js"; // データベース種別の型定義を取り込む
import { determineDatabaseSelection } from "./determine-database-selection.js"; // データベース選択ロジックを再利用する

/**
 * データベースとBlob設定を取得するが副作用は発生させない
 */
export async function collectDatabaseAndBlobConfiguration(
    args: { database?: string },
    template: string | undefined,
    projectName: string
): Promise<{
    database: DatabaseType | undefined;
    databaseConfig: DatabaseProvisioningConfig | undefined;
    blobConfig: BlobConfiguration | undefined;
}> {
    // 状態をユーザーへ知らせるため進捗メッセージを表示する
    console.log("📋 設定を収集中... (プロビジョニングは確認後に実行されます)");

    // テンプレートと引数から利用するデータベース候補を決定する
    const database = await determineDatabaseSelection(args, template);

    // プロビジョニング設定を格納する変数を初期化する
    let databaseConfig: DatabaseProvisioningConfig | undefined;

    // データベースが選択されている場合のみ詳細設定を収集する
    if (database) {
        // SQLiteはローカル運用のため追加設定不要であることをユーザーへ通知する
        if (database === "sqlite") {
            console.log("✅ ローカル SQLite を選択しました（プロビジョニング不要）");
            databaseConfig = undefined;
        } else {
            try {
                // 対話的にデータベース設定を取得する
                databaseConfig = await collectDatabaseConfig(projectName, database);
                console.log(`✅ データベース設定を収集しました (${database})`);
            } catch (error) {
                // キャンセル用のエラーは UserCancelledError として投げる
                if (error instanceof Error && error.message === "DATABASE_PROVISIONING_CANCELLED") {
                    throw new UserCancelledError("データベース設定がキャンセルされました");
                }

                // それ以外のエラーはメッセージを表示して再スローする
                console.error(
                    `❌ データベース設定収集に失敗しました: ${error instanceof Error ? error.message : error}`
                );
                throw error;
            }
        }
    }

    // Blob設定はNext.jsの特定テンプレートでのみ必要になる
    let blobConfig: BlobConfiguration | undefined;
    const shouldConfigureBlob = (projectType: string, templateName: string | undefined) =>
        projectType === "nextjs" && templateName === "fullstack-admin";

    // Next.jsフルスタックテンプレートの場合のみBlob設定をヒアリングする
    if (template && shouldConfigureBlob("nextjs", template)) {
        try {
            // Blob設定の収集結果を取得し、未入力の場合はundefinedに整形する
            const config = await collectBlobConfiguration(projectName);
            blobConfig = config || undefined;
            if (blobConfig) {
                console.log(`✅ Vercel Blob設定を収集しました: ${blobConfig.storeName}`);
            }
        } catch (error) {
            // Blob設定が任意の場合は警告のみ表示して続行する
            console.warn(`⚠️ Vercel Blob設定をスキップします: ${error instanceof Error ? error.message : error}`);
        }
    }

    // 収集した情報をまとめて呼び出し元へ返却する
    return { database, databaseConfig, blobConfig };
}

// EOF
