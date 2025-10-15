/**
 * create/newコマンドが利用するユーザー入力収集処理をまとめたモジュール
 */
import { confirm, promptForDocsGeneration, promptForProjectName } from "../../../utils/user-input/index.js"; // CLIプロンプト関連のヘルパーをまとめて読み込む
import { getMessages } from "../../../i18n.js"; // 多言語メッセージをその場で取得する
import type { ConfirmationInputs, VercelProjectConfig } from "../confirmation/index.js"; // 確認フェーズで使用する入力データ型を取り込む
import { collectDatabaseAndBlobConfiguration } from "./collect-database-and-blob-configuration.js"; // DBとBlob設定の収集ロジックを再利用する
import { determineProjectTypeAndTemplate } from "./determine-project-type-and-template.js"; // プロジェクトタイプ判定ロジックを読み込む
import { hasExplicitMonorepoFlag } from "./has-explicit-monorepo-flag.js"; // モノレポフラグ判定関数を再利用する
import { promptVercelProjectSelection } from "../prompts/vercel-project-prompts.js"; // Vercelプロジェクト選択プロンプト

/**
 * ユーザーへ必要な質問を行い、プロジェクト作成時の入力情報を集約する
 */
export async function collectUserInputs(
    args: {
        name?: string;
        type?: string;
        template?: string;
        database?: string;
        dir?: string;
        simple?: boolean;
        monorepo?: boolean;
    },
    rawArgs: unknown
): Promise<ConfirmationInputs> {
    // メッセージ定義からcreateセクションを抜き出す
    const { create } = getMessages();

    // プロジェクト名は引数優先で、なければプロンプトで取得する
    let projectName = args.name;
    if (!projectName) {
        projectName = await promptForProjectName();
    }

    // モノレポフラグの指定状況を解析する
    const hasExplicitMonorepo = hasExplicitMonorepoFlag(rawArgs);
    // プロジェクトタイプとテンプレートを決定する
    const { projectType, template, monorepoPreference } = await determineProjectTypeAndTemplate(
        args,
        hasExplicitMonorepo
    );

    // データベースとBlob設定を収集する（キャンセル時は例外が投げられる）
    const { database, databaseConfig, blobConfig } = await collectDatabaseAndBlobConfiguration(
        args,
        template,
        projectName
    );

    // ドキュメント生成の希望を確認する
    const shouldGenerateDocs = await promptForDocsGeneration();

    // simple指定時は常にモノレポ無効、それ以外は選択・フラグ結果を優先する
    const finalMonorepoPreference = args.simple ? false : (monorepoPreference ?? args.monorepo ?? true);

    // Next.jsプロジェクトの場合のみVercel連携の意思を確認し、必要に応じてプロジェクト選択を実行
    let shouldLinkVercel = false;
    let vercelConfig: VercelProjectConfig | undefined;
    if (projectType === "nextjs") {
        shouldLinkVercel = await confirm(create.vercelLinkConfirm, false);
        if (shouldLinkVercel) {
            vercelConfig = await promptVercelProjectSelection(projectName, finalMonorepoPreference);
            if (!vercelConfig) {
                // ユーザーがキャンセルした場合はVercelリンクを無効にする
                shouldLinkVercel = false;
            }
        }
    }

    // 収集したデータをConfirmationInputs形式に整形して返す
    return {
        projectName,
        projectType,
        template,
        database,
        databaseConfig,
        blobConfig,
        monorepoPreference: finalMonorepoPreference,
        outputDirectory: args.dir,
        shouldGenerateDocs,
        shouldLinkVercel,
        vercelConfig,
    };
}

// EOF
