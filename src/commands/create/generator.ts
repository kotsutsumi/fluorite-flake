/**
 * プロジェクト生成機能
 */
import chalk from "chalk";
import ora from "ora";

import { debugLog, isDevelopment } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import type { ProjectConfig } from "./types.js";

// プロジェクト生成タイムアウト定数
const SETUP_TIMEOUT_MS = 1000;
const INSTALL_TIMEOUT_MS = 1500;
const CONFIGURE_TIMEOUT_MS = 800;

/**
 * 設定に基づいてプロジェクトを生成
 */
export async function generateProject(config: ProjectConfig): Promise<void> {
    const { create } = getMessages();
    const spinner = ora(
        create.spinnerCreating(config.type, config.name)
    ).start();

    try {
        debugLog(create.debugProjectConfig, config);

        // プロジェクトセットアップのシミュレーション
        spinner.text = create.spinnerSettingUp(config.type);
        await new Promise((resolve) => setTimeout(resolve, SETUP_TIMEOUT_MS));

        // 依存関係インストールのシミュレーション
        spinner.text = create.spinnerInstallingDeps;
        await new Promise((resolve) => setTimeout(resolve, INSTALL_TIMEOUT_MS));

        // テンプレート設定のシミュレーション
        spinner.text = create.spinnerConfiguringTemplate(config.template);
        await new Promise((resolve) =>
            setTimeout(resolve, CONFIGURE_TIMEOUT_MS)
        );

        // 成功メッセージの表示
        spinner.succeed(
            chalk.green(create.spinnerSuccess(config.type, config.name))
        );

        // 開発モードでのデバッグログ
        if (isDevelopment()) {
            debugLog(create.debugGenerationSuccess);
        }
    } catch (error) {
        // エラー処理
        spinner.fail(chalk.red(create.spinnerFailure));

        // 開発モードでのエラーデバッグ
        if (isDevelopment()) {
            debugLog(create.debugGenerationFailure, error);
        }

        throw error;
    }
}

// EOF
