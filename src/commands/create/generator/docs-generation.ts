/**
 * ドキュメント生成処理を担当するモジュール
 */
import fs from "node:fs"; // ファイル操作ユーティリティ
import path from "node:path"; // パス操作ユーティリティ
import chalk from "chalk"; // CLI表示用のカラーライブラリ
import type { Ora } from "ora"; // スピナー型定義

import { debugLog, isDevelopment } from "../../../debug.js"; // デバッグユーティリティ
import { copyDocsTemplate, createDocsPackageJson } from "../../../utils/docs-generator/index.js"; // ドキュメント生成ヘルパー
import type { ProjectConfig } from "../types.js"; // プロジェクト設定型

/**
 * ドキュメントディレクトリを作成可能かを事前に検証する
 */
export function validateDocsDirectory(config: ProjectConfig): { valid: boolean; reason?: string } {
    try {
        const docsPath = config.monorepo
            ? path.join(config.directory, "apps", "docs") // モノレポ時のドキュメントパス
            : path.join(config.directory, "docs"); // 単一プロジェクト時のドキュメントパス

        const parentDir = path.dirname(docsPath); // 親ディレクトリを取得する
        if (!fs.existsSync(parentDir)) {
            return { valid: false, reason: `親ディレクトリが存在しません: ${parentDir}` }; // 親ディレクトリが無ければ失敗扱い
        }

        try {
            fs.accessSync(parentDir, fs.constants.W_OK); // 書き込み権限を確認する
        } catch {
            return { valid: false, reason: `ディレクトリへの書き込み権限がありません: ${parentDir}` }; // 権限が無ければ失敗扱い
        }

        return { valid: true }; // 問題がなければ成功を返す
    } catch (error) {
        return { valid: false, reason: `ディレクトリ検証中にエラーが発生: ${error}` }; // 例外発生時は理由付きで失敗を返す
    }
}

/**
 * ドキュメントサイト生成処理（リカバリ対応付き）
 */
export async function handleDocsGeneration(config: ProjectConfig, spinner: Ora): Promise<void> {
    if (!config.shouldGenerateDocs) {
        return; // ドキュメント生成が不要なら処理を終了する
    }

    debugLog("Starting documentation generation", {
        projectName: config.name,
        isMonorepo: config.monorepo,
        outputPath: config.directory,
    }); // 生成開始時のデバッグ情報を出力する

    const validation = validateDocsDirectory(config); // 事前検証を行う
    if (!validation.valid) {
        const errorMessage = `ドキュメント生成の事前検証失敗: ${validation.reason}`; // エラーメッセージを準備する
        debugLog("Documentation validation failed", { reason: validation.reason }); // 失敗理由をデバッグ出力
        console.warn(chalk.yellow(`⚠️ ${errorMessage}`)); // ユーザーへ警告を表示する
        console.warn(chalk.yellow("ドキュメント生成をスキップします")); // スキップを通知する
        return;
    }

    spinner.text = "📚 Nextraドキュメントサイトを生成中..."; // スピナーテキストを更新する
    let templateCopySuccess = false; // テンプレートコピー状況を記録する
    let packageJsonSuccess = false; // package.json生成状況を記録する

    try {
        spinner.text = "📚 ドキュメントテンプレートをコピー中..."; // テンプレートコピー開始を表示
        const docsTemplateOptions = {
            projectName: config.name, // プロジェクト名
            outputPath: config.directory, // 出力先ディレクトリ
            isMonorepo: config.monorepo, // モノレポフラグ
            title: `${config.name} Documentation`, // サイトタイトル
            description: `Documentation for ${config.name}`, // サイト説明
        };

        templateCopySuccess = await copyDocsTemplate(docsTemplateOptions); // テンプレートをコピーする
        if (!templateCopySuccess) {
            throw new Error("ドキュメントテンプレートのコピーに失敗しました"); // 失敗した場合は例外を投げる
        }

        debugLog("Documentation template copied successfully"); // 成功をデバッグ出力する

        spinner.text = "📦 ドキュメント用package.jsonを生成中..."; // package.json生成開始を表示
        const packageJsonOptions = {
            projectName: config.name, // プロジェクト名
            outputPath: config.directory, // 出力先
            isMonorepo: config.monorepo, // モノレポフラグ
            reactVersion: "^19.1.0", // Reactバージョン
            nextVersion: "^15.5.4", // Next.jsバージョン
            nextraVersion: "^4.6.0", // Nextraバージョン
        };

        packageJsonSuccess = await createDocsPackageJson(packageJsonOptions); // package.jsonを生成する
        if (!packageJsonSuccess) {
            throw new Error("ドキュメント用package.jsonの生成に失敗しました"); // 失敗時は例外を投げる
        }

        debugLog("Documentation generation completed successfully", {
            projectName: config.name,
            isMonorepo: config.monorepo,
        }); // 成功時の詳細をデバッグ出力する
    } catch (error) {
        debugLog("Documentation generation failed", {
            error,
            templateCopySuccess,
            packageJsonSuccess,
        }); // 失敗時の詳細をデバッグ出力する

        const docsPath = config.monorepo
            ? path.join(config.directory, "apps", "docs")
            : path.join(config.directory, "docs"); // 生成先のパスを計算する

        if (fs.existsSync(docsPath)) {
            try {
                fs.rmSync(docsPath, { recursive: true, force: true }); // 部分的に生成されたディレクトリを削除する
                debugLog("Cleaned up partial documentation directory", { docsPath }); // クリーンアップ成功を記録する
            } catch (cleanupError) {
                debugLog("Failed to cleanup documentation directory", { cleanupError, docsPath }); // クリーンアップ失敗時の情報を記録する
            }
        }

        console.warn(chalk.yellow("⚠️ ドキュメント生成中にエラーが発生しました")); // ユーザーへ警告を表示する
        console.warn(chalk.yellow("プロジェクト生成は継続されますが、ドキュメントは生成されませんでした")); // スキップを通知する

        if (isDevelopment()) {
            console.warn(chalk.gray(`詳細: ${error}`)); // 開発モードでは詳細を表示する
        }

        console.warn(chalk.cyan("💡 後でドキュメントを追加する場合:")); // 手動手順の案内を表示する
        if (config.monorepo) {
            console.warn(chalk.cyan("   pnpm create next-app@latest apps/docs --example blog-starter")); // モノレポ時の例
        } else {
            console.warn(chalk.cyan("   pnpm create next-app@latest docs --example blog-starter")); // 単一プロジェクト時の例
        }
    }
}

// EOF
