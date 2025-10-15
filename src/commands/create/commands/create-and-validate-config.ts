/**
 * プロジェクト設定の生成と検証を行う関数を定義する
 */
import { confirmDirectoryOverwrite } from "../../../utils/user-input/index.js"; // ディレクトリ上書き確認用のプロンプトを読み込む
import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js"; // Blob設定の型情報をインポートする
import { createProjectConfig } from "../config.js"; // プロジェクトの基本設定を構築する関数を利用する
import type { ConfirmationInputs } from "../confirmation/index.js"; // ユーザー入力の型を参照する
import type { DatabaseCredentials, DatabaseProvisioningConfig } from "../database-provisioning/types.js"; // データベース関連の型定義を取り込む
import type { ProjectConfig, DatabaseType } from "../types.js"; // プロジェクト構成とデータベース種別の型を参照する

/**
 * createAndValidateConfig関数に渡すオプションの型定義
 */
export type CreateAndValidateConfigOptions = {
    projectType: string; // プロジェクト種別
    projectName: string; // プロジェクト名
    template: string | undefined; // 利用するテンプレート名
    args: { dir?: string; force?: boolean }; // CLI引数から受け取ったディレクトリやforce情報
    isMonorepoMode: boolean; // モノレポモードかどうか
    database?: DatabaseType; // データベース種別
    databaseConfig?: DatabaseProvisioningConfig; // プロビジョニング設定
    databaseCredentials?: DatabaseCredentials; // プロビジョニング完了後の資格情報
    blobConfig?: BlobConfiguration; // Vercel Blob設定
    pnpmVersion?: string; // 確認済みのpnpmバージョン
    shouldGenerateDocs?: boolean; // ドキュメント生成フラグ
};

/**
 * プロジェクト設定を作成し必要な検証とユーザー確認を行う
 */
export async function createAndValidateConfig(options: CreateAndValidateConfigOptions): Promise<ProjectConfig> {
    const {
        projectType,
        projectName,
        template,
        args,
        isMonorepoMode,
        database,
        databaseConfig,
        databaseCredentials,
        blobConfig,
        pnpmVersion,
        shouldGenerateDocs,
    } = options; // オプションから必要な値を取り出す

    // createProjectConfigでベース設定を構築する
    const config = createProjectConfig(projectType, {
        name: projectName,
        template,
        dir: args.dir,
        force: args.force,
        monorepo: isMonorepoMode,
        database,
    });

    // 生成に失敗した場合は即座に終了する
    if (!config) {
        process.exit(1);
    }

    // 条件に応じて追加情報を設定へ反映していく
    if (databaseConfig) {
        config.databaseConfig = databaseConfig;
    }
    if (databaseCredentials) {
        config.databaseCredentials = databaseCredentials;
    }
    if (blobConfig) {
        config.blobConfig = blobConfig;
    }
    if (pnpmVersion) {
        config.pnpmVersion = pnpmVersion;
    }
    if (shouldGenerateDocs !== undefined) {
        config.shouldGenerateDocs = shouldGenerateDocs;
    }

    // forceフラグが無い場合はディレクトリ上書き確認を行う
    if (!config.force) {
        const shouldProceed = await confirmDirectoryOverwrite(config.directory);
        if (!shouldProceed) {
            process.exit(0);
        }
    }

    // 問題が無ければ完成した設定を返す
    return config;
}

/**
 * ConfirmationInputsとの互換性を保つための型エイリアス
 * （既存の利用箇所に影響を与えないようここで再エクスポートする）
 */
export type { ConfirmationInputs };

// EOF
