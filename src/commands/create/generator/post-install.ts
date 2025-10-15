/**
 * プロジェクト生成後の再インストール処理を担当するモジュール
 */
import fs from "node:fs"; // ファイル存在確認などに利用する
import path from "node:path"; // パス操作ユーティリティ
import { execSync } from "node:child_process"; // コマンド実行ユーティリティ
import chalk from "chalk"; // CLIのカラー表示用ライブラリ
import type { Ora } from "ora"; // スピナー型定義

import { debugLog, isDevelopment } from "../../../debug.js"; // デバッグユーティリティ
import { getMessages } from "../../../i18n.js"; // メッセージ辞書
import type { ProjectConfig } from "../types.js"; // プロジェクト設定型

/**
 * monorepoかつドキュメントプロジェクトが生成された場合に再インストールが必要か判定する
 */
export function shouldPostInstall(config: ProjectConfig): boolean {
    if (!config.monorepo) {
        return false; // モノレポ構成でなければ再インストール不要
    }

    if (!config.shouldGenerateDocs) {
        return false; // ドキュメント生成を行っていなければ不要
    }

    const docsPath = path.join(config.directory, "apps", "docs"); // ドキュメントディレクトリのパスを組み立てる
    return fs.existsSync(docsPath); // 実際にディレクトリが存在すれば再インストール対象とする
}

/**
 * プロジェクト構造が再インストール可能な状態かを検証する
 */
function validateProjectStructure(projectPath: string): { valid: boolean; reason?: string } {
    try {
        if (!fs.existsSync(projectPath)) {
            return { valid: false, reason: "プロジェクトディレクトリが存在しません" }; // ルートディレクトリが無ければ失敗
        }

        const packageJsonPath = path.join(projectPath, "package.json"); // ルートpackage.jsonのパス
        if (!fs.existsSync(packageJsonPath)) {
            return { valid: false, reason: "ルートpackage.jsonが存在しません" }; // package.jsonが無ければ失敗
        }

        const workspaceFilePath = path.join(projectPath, "pnpm-workspace.yaml"); // pnpmワークスペースファイル
        if (!fs.existsSync(workspaceFilePath)) {
            return { valid: false, reason: "pnpm-workspace.yamlが存在しません" }; // ワークスペース定義が無ければ失敗
        }

        return { valid: true }; // 構造に問題が無ければ成功
    } catch (error) {
        return { valid: false, reason: `構造検証中にエラーが発生: ${error}` }; // 例外発生時の詳細を返す
    }
}

/**
 * monorepo向けの再インストール処理（リトライ対応付き）
 */
export async function executePostInstall(projectPath: string, spinner: Ora): Promise<void> {
    const { create } = getMessages(); // メッセージ辞書からcreateセクションを読み込む
    const maxRetries = 2; // 最大リトライ回数
    let attempt = 0; // 現在の試行回数

    const validation = validateProjectStructure(projectPath); // 事前検証を実行
    if (!validation.valid) {
        debugLog("Project structure validation failed", { reason: validation.reason }); // 失敗理由を記録
        console.warn(chalk.yellow(`⚠️ プロジェクト構造の検証失敗: ${validation.reason}`)); // 警告を表示
        console.warn(chalk.yellow(create.postInstallFailed)); // ユーザー向けメッセージを表示
        return;
    }

    while (attempt <= maxRetries) {
        try {
            const retryMessage = attempt > 0 ? ` (${attempt + 1}/${maxRetries + 1}回目)` : ""; // リトライ表記を組み立てる
            spinner.text = `${create.spinnerPostInstalling}${retryMessage}`; // スピナーテキストを更新する

            debugLog("Starting post-install for monorepo", {
                projectPath,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
            }); // 実行開始をデバッグ出力する

            execSync("pnpm install", {
                cwd: projectPath, // プロジェクトルートで実行する
                stdio: isDevelopment() ? "inherit" : "pipe", // 開発モードでは標準出力をそのまま表示する
                timeout: 120000, // タイムアウトを設定する（2分）
            }); // pnpm installを実行する

            debugLog("Post-install completed successfully", { attempt: attempt + 1 }); // 成功を記録する
            return; // 成功したのでループを抜ける
        } catch (error) {
            attempt++; // 試行回数を増やす
            debugLog("Post-install failed", {
                error,
                attempt,
                willRetry: attempt <= maxRetries,
            }); // 失敗とリトライの有無を記録する

            if (attempt > maxRetries) {
                if (isDevelopment()) {
                    console.warn(chalk.yellow(create.postInstallFailed)); // 開発モードでは詳細を表示する
                    console.warn(chalk.gray(`詳細 (${maxRetries + 1}回試行後): ${error}`)); // リトライ結果を表示する
                } else {
                    console.warn(chalk.yellow(create.postInstallFailed)); // 本番モードでは簡易表示のみ
                }

                console.warn(chalk.cyan("💡 手動で依存関係をインストールする場合:")); // 手動手順を案内する
                console.warn(chalk.cyan(`   cd ${path.relative(process.cwd(), projectPath)}`)); // cdコマンドの例
                console.warn(chalk.cyan("   pnpm install")); // インストールコマンドの例
                break; // ループを抜ける
            }

            await new Promise((resolve) => setTimeout(resolve, 1000)); // リトライ前に少し待機する
        }
    }
}

// EOF
