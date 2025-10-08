/**
 * プロジェクト作成の設定確認モジュール
 *
 * ユーザーの入力内容を表示し、最終確認を行う処理を提供します。
 * 副作用（ファイル生成、API呼び出し）は一切実行しません。
 */

import { getMessages, type LocaleMessages } from "../../../i18n.js";
import { confirm } from "../../../utils/user-input/index.js";
import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js";
import type { DatabaseProvisioningConfig } from "../database-provisioning/types.js";
import type { DatabaseType } from "../types.js";

/**
 * 確認フェーズで使用する入力情報の型定義
 */
export type ConfirmationInputs = {
    /** プロジェクト名 */
    projectName: string;
    /** プロジェクトタイプ（nextjs, expo, tauriなど） */
    projectType: string;
    /** 選択されたテンプレート（fullstack-admin等） */
    template?: string;
    /** 選択されたデータベース種別（sqlite, turso, supabaseなど） */
    database?: DatabaseType;
    /** データベース設定（プロビジョニング情報を含む） */
    databaseConfig?: DatabaseProvisioningConfig;
    /** Blob設定（Vercel Blob設定情報） */
    blobConfig?: BlobConfiguration;
    /** モノレポ構造の使用設定 */
    monorepoPreference: boolean;
    /** 出力ディレクトリ */
    outputDirectory?: string;
};

/**
 * 設定確認画面を表示し、ユーザーの最終確認を取得
 *
 * @param inputs - 確認対象の入力情報
 * @returns ユーザーが続行を選択した場合はtrue、キャンセルの場合はfalse
 */
export async function displayConfirmation(inputs: ConfirmationInputs): Promise<boolean> {
    const messages: LocaleMessages = getMessages();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📋 ${messages.create.confirmation.title}`);
    console.log("=".repeat(60));

    // プロジェクト基本情報の表示
    console.log(`\n🏗️  ${messages.create.confirmation.projectInfo}`);
    console.log(`   ${messages.common.projectName}: ${inputs.projectName}`);
    console.log(`   ${messages.common.projectType}: ${inputs.projectType}`);
    if (inputs.template) {
        console.log(`   ${messages.common.template}: ${inputs.template}`);
    }
    if (inputs.database) {
        console.log(`   データベース: ${inputs.database}`);
    }
    console.log(
        `   ${messages.common.monorepo}: ${inputs.monorepoPreference ? messages.common.enabled : messages.common.disabled}`
    );
    if (inputs.outputDirectory) {
        console.log(`   ${messages.common.outputDir}: ${inputs.outputDirectory}`);
    }

    console.log(`\n${"=".repeat(60)}`);

    // 最終確認の取得
    const shouldContinue = await confirm(
        messages.create.confirmation.continuePrompt,
        true // デフォルトはtrue（続行）
    );

    if (!shouldContinue) {
        console.log(`\n⚠️  ${messages.create.confirmation.cancelled}`);
        return false;
    }

    console.log("\n✅ プロジェクト作成を開始します...");
    return true;
}

// EOF
