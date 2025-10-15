/**
 * createコマンド本体の定義を提供するモジュール
 */
import { defineCommand } from "citty"; // CittyのdefineCommandを利用してCLIコマンドを構築する

import { debugLog } from "../../../debug.js"; // デバッグログ出力ユーティリティを読み込む
import { getMessages } from "../../../i18n.js"; // 多言語メッセージ辞書を取得する
import { validatePnpmWithDetails } from "../../../utils/pnpm-validator/index.js"; // pnpm環境の検証ロジックを利用する
import { confirmDirectoryOverwrite } from "../../../utils/user-input/index.js"; // CLIプロンプトのヘルパー群を読み込む
import type { DatabaseCredentials } from "../database-provisioning/types.js"; // データベース資格情報の型を参照する
import type { DatabaseType, ProjectConfig } from "../types.js"; // データベース種別とプロジェクト設定の型を参照する
import { linkVercelProject } from "../post-generation/index.js"; // プロジェクト生成後のVercel連携処理を取り込む
import { displayConfirmation } from "../confirmation/index.js"; // 確認フェーズの表示処理を読み込む
import { executeProvisioning } from "../execution/index.js"; // データベースなどのプロビジョニング処理を実行する関数
import { generateProject } from "../generator/index.js"; // 実際にテンプレートを生成する関数を利用する
import type { ConfirmationInputs } from "../confirmation/index.js"; // ユーザー入力情報の型を参照する
import { collectUserInputs } from "./collect-user-inputs.js"; // ユーザー入力を収集するロジックを再利用する
import { createAndValidateConfig } from "./create-and-validate-config.js"; // 設定生成と検証処理を呼び出す
import { createTursoTables } from "./create-turso-tables.js"; // Tursoテーブル作成処理を利用する
import { initialMessages } from "./shared.js"; // 共有メッセージ定義を参照する
import { createCommandArgs } from "./create-command-args.js"; // コマンド引数定義を共有する

/**
 * createコマンドの実装
 */
export const createCommand = defineCommand({
    meta: {
        name: "create", // コマンド名
        description: initialMessages.create.commandDescription, // コマンドの説明文
    },
    args: createCommandArgs, // 共有定義された引数オブジェクトを利用する
    async run({ args }) {
        const { create } = getMessages(); // 最新のメッセージを取得する
        debugLog(create.debugCommandCalled, args); // デバッグログで呼び出し引数を記録する

        // デフォルトタイプとモードを算出する
        const resolvedProjectType = args.type ?? "nextjs"; // 指定が無ければNext.js扱い
        const isMonorepoMode = args.simple ? false : (args.monorepo ?? true); // simple指定時はモノレポ禁止

        // モノレポ向けにはpnpmのバリデーションを実行する
        let pnpmVersion: string | undefined;
        if (isMonorepoMode) {
            const pnpmValidation = validatePnpmWithDetails(); // pnpmの利用可否をチェックする
            if (!pnpmValidation.isValid) {
                process.exit(1); // バリデーション失敗時はエラー終了
            }
            pnpmVersion = pnpmValidation.version; // バージョン情報を保持する
        }

        // ステップ1: 副作用のない入力収集フェーズ
        const inputs: ConfirmationInputs = await collectUserInputs(
            {
                ...args, // 受け取った引数を展開する
                type: resolvedProjectType, // 解決済みのタイプを上書きする
                monorepo: isMonorepoMode, // モノレポモードを共有する
            },
            []
        );

        // モノレポを選択したがpnpmバージョンが未取得の場合はここで検証する
        if (inputs.monorepoPreference && !pnpmVersion) {
            const pnpmValidation = validatePnpmWithDetails(); // 再度バリデーションを実施する
            if (!pnpmValidation.isValid) {
                process.exit(1); // 不正な場合は終了
            }
            pnpmVersion = pnpmValidation.version; // バージョン情報を保存する
        }

        // ステップ2: ユーザー確認フェーズ
        const confirmed = await displayConfirmation(inputs); // 入力内容の確認ダイアログを表示する
        if (!confirmed) {
            process.exit(0); // キャンセル時は正常終了
        }

        // ステップ3: 実行フェーズ（副作用あり）
        let databaseCredentials: DatabaseCredentials | undefined;
        let database: DatabaseType | undefined;

        // データベースプロビジョニングが必要な場合はここで実行する
        if (inputs.databaseConfig) {
            console.log("🚀 プロビジョニングを実行しています..."); // 進捗を表示する
            const result = await executeProvisioning(inputs); // プロビジョニング処理を呼び出す

            if (!result.success) {
                console.error(`❌ プロビジョニングに失敗しました: ${result.error}`); // エラー内容を表示する
                process.exit(1); // 失敗時は終了
            }

            databaseCredentials = result.databaseCredentials; // 成功時は資格情報を保持する
            database = inputs.databaseConfig.type; // 選択されたデータベース種別を記録する
        }

        // プロジェクト設定を生成し検証する
        const config: ProjectConfig = await createAndValidateConfig({
            projectType: inputs.projectType,
            projectName: inputs.projectName,
            template: inputs.template,
            args,
            isMonorepoMode: inputs.monorepoPreference,
            database: database ?? inputs.database,
            databaseConfig: inputs.databaseConfig,
            databaseCredentials,
            blobConfig: inputs.blobConfig,
            pnpmVersion,
            shouldGenerateDocs: inputs.shouldGenerateDocs,
        });

        // createAndValidateConfigでforceを考慮しているが、従来挙動維持のため追加確認を行う
        if (!args.force) {
            const shouldProceed = await confirmDirectoryOverwrite(config.directory); // ディレクトリ上書きを再確認する
            if (!shouldProceed) {
                process.exit(0); // キャンセル時は正常終了
            }
        }

        try {
            // プロジェクトのテンプレートを生成する
            await generateProject(config);

            // Vercelリンクを希望する場合は.vercelディレクトリを生成する
            if (inputs.shouldLinkVercel && inputs.vercelConfig) {
                linkVercelProject(config, inputs.vercelConfig);
            }

            // Tursoを利用する場合はテーブル作成処理を実行する
            if (databaseCredentials && database === "turso") {
                console.log("🗄️ Tursoクラウドデータベースにテーブルを作成中..."); // 進捗メッセージ
                await createTursoTables(config, databaseCredentials);
            }

            // 正常完了をデバッグログに記録する
            debugLog("Create command completed successfully");
        } catch (error) {
            // 生成処理で例外が発生した場合はエラーログを表示する
            console.error("❌ プロジェクトの作成に失敗しました");
            if (error instanceof Error) {
                console.error(`🐛 デバッグ: ${error.message}`); // エラーメッセージを表示する
                debugLog("Detailed error:", error); // 詳細ログを出力する
            } else {
                console.error(`🐛 デバッグ: ${String(error)}`); // 非Errorの場合も文字列化して表示する
                debugLog("Detailed error:", error); // 詳細ログを出力する
            }
            process.exit(1); // 失敗時は非ゼロ終了
        }

        // 正常終了を明示する
        process.exit(0);
    },
});

// EOF
