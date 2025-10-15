/**
 * newコマンド（createのエイリアス）の実装を提供するモジュール
 */
import { defineCommand } from "citty"; // CittyのdefineCommandを利用してコマンドを構築する

import { debugLog } from "../../../debug.js"; // デバッグログ出力ユーティリティ
import { getMessages } from "../../../i18n.js"; // メッセージ辞書を取得する
import { validatePnpmWithDetails } from "../../../utils/pnpm-validator/index.js"; // pnpm検証ロジックを利用する
import { displayConfirmation } from "../confirmation/index.js"; // 確認フェーズの表示処理
import { executeProvisioning } from "../execution/index.js"; // プロビジョニング実行処理
import { generateProject } from "../generator/index.js"; // プロジェクト生成関数
import { createAndValidateConfig } from "./create-and-validate-config.js"; // 設定生成と検証処理
import { collectUserInputs } from "./collect-user-inputs.js"; // ユーザー入力収集処理
import { createTursoTables } from "./create-turso-tables.js"; // Tursoテーブル作成処理
import type { DatabaseCredentials } from "../database-provisioning/types.js"; // データベース資格情報の型
import type { DatabaseType } from "../types.js"; // データベース種別の型
import { initialMessages } from "./shared.js"; // 共有メッセージ定義
import { createCommandArgs } from "./create-command-args.js"; // createコマンドと共通の引数定義

/**
 * newコマンドはcreateコマンドのエイリアスとして振る舞う
 */
export const newCommand = defineCommand({
    meta: {
        name: "new", // コマンド名
        description: initialMessages.create.newCommandDescription, // コマンド説明
    },
    args: createCommandArgs, // createコマンドと同じ引数定義を共有する
    async run(context) {
        const { args, rawArgs } = context; // 受け取った引数と生引数を展開する
        const { create } = getMessages(); // 最新のメッセージを読み込む
        debugLog(create.debugCommandCalled, args); // 呼び出し情報をデバッグ出力する

        // 副作用のない入力収集フェーズ
        const inputs = await collectUserInputs(args, rawArgs); // ユーザー入力をまとめて取得する

        // モノレポ選択時はpnpmのバリデーションを実施する
        let pnpmVersion: string | undefined;
        if (inputs.monorepoPreference) {
            const pnpmValidation = validatePnpmWithDetails(); // pnpmの状態を確認する
            if (!pnpmValidation.isValid) {
                process.exit(1); // バリデーション失敗で終了する
            }
            pnpmVersion = pnpmValidation.version; // 成功時はバージョンを保持する
        }

        // 確認フェーズを実行しキャンセル時は終了する
        const confirmed = await displayConfirmation(inputs); // 入力内容の確認表示
        if (!confirmed) {
            process.exit(0); // キャンセル時の正常終了
        }

        // プロビジョニングと生成フェーズの準備を行う
        let databaseCredentials: DatabaseCredentials | undefined;
        let database: DatabaseType | undefined;

        // プロビジョニングが必要な場合のみ実行する
        if (inputs.databaseConfig) {
            console.log("🚀 プロビジョニングを実行しています..."); // 進捗メッセージ
            const result = await executeProvisioning(inputs); // プロビジョニングを実行する

            if (!result.success) {
                console.error(`❌ プロビジョニングに失敗しました: ${result.error}`); // エラーメッセージ
                process.exit(1); // エラー終了
            }

            databaseCredentials = result.databaseCredentials; // 成功時に資格情報を保持する
            database = inputs.databaseConfig.type; // 選択されたDB種別を保持する
        }

        // プロジェクト設定を生成して検証する
        const config = await createAndValidateConfig({
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

        try {
            // プロジェクトテンプレートを生成する
            await generateProject(config);

            // Turso利用時はテーブルを作成する
            if (databaseCredentials && database === "turso") {
                console.log("🗄️ Tursoクラウドデータベースにテーブルを作成中..."); // 進捗メッセージ
                await createTursoTables(config, databaseCredentials);
            }

            // 正常完了をデバッグログに記録する
            debugLog("New command completed successfully");
        } catch (error) {
            // 発生したエラーを詳細に表示する
            console.error("❌ プロジェクトの作成に失敗しました");
            if (error instanceof Error) {
                console.error(`🐛 デバッグ: ${error.message}`); // エラーメッセージを表示
                debugLog("Detailed error:", error); // 詳細ログ
            } else {
                console.error(`🐛 デバッグ: ${String(error)}`); // 非Errorの場合の表示
                debugLog("Detailed error:", error); // 詳細ログ
            }
            process.exit(1); // エラー終了
        }

        process.exit(0); // 正常終了
    },
});

// EOF
