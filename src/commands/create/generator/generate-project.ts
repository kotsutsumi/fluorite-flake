/**
 * プロジェクト全体の生成フローを統括するモジュール
 */
import fs from "node:fs"; // ファイルシステム操作を行うためのモジュール
import path from "node:path"; // パス操作ユーティリティ
import chalk from "chalk"; // CLI出力に彩色を加えるためのライブラリ
import ora from "ora"; // プログレス表示用のスピナーライブラリ

import { debugLog, isDevelopment } from "../../../debug.js"; // デバッグ用ユーティリティ関数
import { getMessages } from "../../../i18n.js"; // 多言語メッセージ辞書を取得する関数
import { syncRootScripts } from "../../../utils/workspace-manager/index.js"; // ワークスペース用スクリプトを同期する関数
import type { ProjectConfig } from "../types.js"; // プロジェクト設定の型定義

import { SETUP_TIMEOUT_MS } from "./constants.js"; // 擬似待機時間の定数
import { cleanupFailedProject } from "./cleanup.js"; // クリーンアップ処理
import { handleDocsGeneration } from "./docs-generation.js"; // ドキュメント生成処理
import { executePostInstall, shouldPostInstall } from "./post-install.js"; // 再インストール関連処理
import { handleAdvancedTemplate } from "./handle-advanced-template.js"; // 拡張テンプレート生成処理
import { handleStandardTemplate } from "./handle-standard-template.js"; // 標準テンプレート生成処理
import { fixBiomeConfiguration } from "./biome-configuration.js"; // Biome設定調整処理
import { isAdvancedTemplate } from "./template-flags.js"; // テンプレート種別の判定関数
import { validateProjectGeneration } from "./project-validation.js"; // 事前検証ロジック

/**
 * 設定に基づいてプロジェクトを生成するメイン関数
 */
export async function generateProject(config: ProjectConfig): Promise<void> {
    const { create } = getMessages(); // createコマンド用のメッセージを取得する
    const spinner = ora(create.spinnerCreating(config.type, config.name)).start(); // スピナーを開始する
    let projectCreated = false; // プロジェクトディレクトリを作成したかを追跡する
    let templatesCompleted = false; // テンプレート生成が完了したかを追跡する
    let docsCompleted = false; // ドキュメント生成が完了したかを追跡する

    try {
        debugLog(create.debugProjectConfig, config); // プロジェクト設定の詳細をデバッグログに出力する

        const validation = validateProjectGeneration(config); // 事前検証を実施する
        if (!validation.valid) {
            throw new Error(`プロジェクト生成の事前検証失敗: ${validation.reason}`); // 検証失敗時は例外を投げる
        }

        spinner.text = create.spinnerSettingUp(config.type); // セットアップ開始をスピナーに表示する
        await new Promise((resolve) => setTimeout(resolve, SETUP_TIMEOUT_MS)); // 擬似的な待機を行う

        if (!fs.existsSync(config.directory)) {
            fs.mkdirSync(config.directory, { recursive: true }); // プロジェクトディレクトリを作成する
            projectCreated = true; // 作成済みフラグを更新する
            debugLog("Project directory created successfully", { directory: config.directory }); // 成功を記録する
        }

        const shouldUseAdvancedTemplate = isAdvancedTemplate(config); // 拡張テンプレートかどうかを判定する
        if (shouldUseAdvancedTemplate) {
            await handleAdvancedTemplate(config, spinner); // 拡張テンプレートの生成を実行する
        } else {
            await handleStandardTemplate(config, spinner); // 標準テンプレートの生成を実行する
        }
        templatesCompleted = true; // テンプレート生成が完了したことを記録する
        debugLog("Template generation completed successfully"); // デバッグに成功ログを残す

        await handleDocsGeneration(config, spinner); // ドキュメント生成処理を実行する
        docsCompleted = true; // ドキュメント生成完了フラグを更新する

        if (config.monorepo) {
            spinner.text = "🔧 ワークスペーススクリプトを同期中..."; // スピナーテキストを更新する
            await syncRootScripts(config.directory); // ルートスクリプトを同期する
            debugLog("Root scripts synchronized successfully"); // 同期成功を記録する
        }

        spinner.text = "🔧 Biome設定を最適化中..."; // Biome調整中であることを表示する
        await fixBiomeConfiguration(config.directory); // Biome設定をアップデートする
        debugLog("Biome configuration fixed successfully"); // 調整成功を記録する

        if (shouldPostInstall(config)) {
            await executePostInstall(config.directory, spinner); // 必要な場合は再インストールを実行する
        }

        spinner.succeed(chalk.green(create.spinnerSuccess(config.type, config.name))); // 成功メッセージを表示する

        const currentDir = process.cwd(); // 現在の作業ディレクトリを取得する
        const projectPath = path.resolve(currentDir, config.directory); // プロジェクトへのフルパスを計算する
        console.log(chalk.cyan(`📂 プロジェクトの場所: ${projectPath}`)); // プロジェクトの場所を案内する

        if (isDevelopment()) {
            debugLog(create.debugGenerationSuccess); // 開発モードでは追加の成功ログを出力する
        }
    } catch (error) {
        spinner.fail(chalk.red(create.spinnerFailure)); // 失敗をスピナーに表示する

        debugLog("Project generation failed", {
            error,
            projectCreated,
            templatesCompleted,
            docsCompleted,
            config,
        }); // 失敗時のコンテキストをログに残す

        if (error instanceof Error) {
            console.error(chalk.red(`❌ ${error.message}`)); // Errorオブジェクトの場合はメッセージを表示する
        } else {
            console.error(chalk.red(`❌ 予期しないエラーが発生しました: ${error}`)); // その他の値の場合も文字列化して表示する
        }

        if (isDevelopment()) {
            debugLog(create.debugGenerationFailure, error); // 開発モードでは詳細情報を出力する
            console.error(chalk.gray("スタックトレース:")); // スタックトレースのラベルを表示する
            console.error(chalk.gray(error instanceof Error ? error.stack : String(error))); // トレースを表示する
        }

        if (projectCreated && !templatesCompleted) {
            console.warn(chalk.yellow("部分的に作成されたプロジェクトをクリーンアップしています...")); // クリーンアップ開始を通知する
            await cleanupFailedProject(config); // クリーンアップを実行する
        }

        console.error(chalk.cyan("\n💡 トラブルシューティング:")); // ヒント見出しを表示する
        console.error(chalk.cyan("1. ディスクの空き容量を確認してください")); // ヒント1
        console.error(chalk.cyan("2. プロジェクト名と場所に特殊文字が含まれていないか確認してください")); // ヒント2
        console.error(chalk.cyan("3. 必要な権限があることを確認してください")); // ヒント3
        console.error(chalk.cyan("4. 開発モード（NODE_ENV=development）で詳細情報を確認してください")); // ヒント4

        throw error; // 呼び出し元へ例外を再送する
    }
}

// EOF
