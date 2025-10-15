/**
 * 拡張テンプレートを生成するロジックをまとめたモジュール
 */
import fs from "node:fs"; // ファイルシステム操作を行うモジュール
import path from "node:path"; // パス操作ユーティリティ

import { debugLog } from "../../../debug.js"; // デバッグログ出力関数
import { getMessages } from "../../../i18n.js"; // 多言語メッセージを取得する関数
import { copyMonorepoTemplates, createMonorepoStructure } from "../../../utils/monorepo-generator/index.js"; // モノレポ構造生成ユーティリティ
import { createSpinnerController } from "../../../utils/spinner-control/index.js"; // スピナー制御ユーティリティ
import type { Ora } from "ora"; // スピナーインスタンスの型定義をインポートする

import {
    generateExpoFullstackAdmin,
    generateExpoGraphQL,
    generateFullStackAdmin,
    generateTauriCrossPlatform,
} from "../template-generators/index.js"; // テンプレート別生成ロジック
import type { GenerationContext, TemplateGenerationResult } from "../template-generators/types.js"; // テンプレート生成結果の型
import type { ProjectConfig } from "../types.js"; // プロジェクト設定の型定義

/**
 * 拡張テンプレートを生成する際のメイン処理
 */
export async function handleAdvancedTemplate(config: ProjectConfig, spinner: Ora): Promise<void> {
    const { create } = getMessages(); // createコマンド用メッセージを取得する
    spinner.text = create.spinnerConfiguringTemplate(config.template); // スピナーテキストを更新する

    // モノレポ構成の場合はapps/web配下を生成対象とする
    const targetDirectory = config.monorepo ? path.join(config.directory, "apps", "web") : config.directory;

    if (config.monorepo) {
        createMonorepoStructure(config); // モノレポのディレクトリ構造を組み立てる
        copyMonorepoTemplates(config, config.pnpmVersion); // 共通テンプレートをコピーする
        if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory, { recursive: true }); // apps/webが無ければ作成する
        }
    }

    // テンプレート生成で使用するコンテキストを準備する
    const generationContext: GenerationContext = {
        config, // プロジェクト設定
        useMonorepo: Boolean(config.monorepo), // モノレポ利用フラグ
        targetDirectory, // 生成先ディレクトリ
        databaseConfig: config.databaseConfig, // DB設定
        databaseCredentials: config.databaseCredentials, // DB資格情報
        blobConfig: config.blobConfig, // Blob設定
    };

    // スピナーの進行を制御するヘルパーを作成する
    const spinnerController = createSpinnerController(spinner);

    // テンプレート種別ごとに適切なジェネレーターを呼び出す
    let result: TemplateGenerationResult; // 生成結果を保持する変数
    if (config.type === "nextjs") {
        result = await generateFullStackAdmin(generationContext, spinnerController); // Next.js用テンプレートを生成する
    } else if (config.type === "expo") {
        if (config.template === "fullstack-graphql") {
            result = await generateExpoGraphQL(generationContext); // Expo + GraphQLテンプレート
        } else if (config.template === "fullstack-admin") {
            result = await generateExpoFullstackAdmin(generationContext); // Expo + Adminテンプレート
        } else {
            throw new Error(`Unsupported expo template: ${config.template}`); // 未対応テンプレートの防御
        }
    } else if (config.type === "tauri") {
        result = await generateTauriCrossPlatform(generationContext); // Tauri拡張テンプレート
    } else {
        throw new Error(`Unsupported advanced template: ${config.type}/${config.template}`); // 未対応フレームワークの防御
    }

    // 生成処理が失敗した場合はエラーを投げる
    if (!result.success) {
        throw new Error(`Template generation failed: ${result.errors?.join(", ")}`);
    }

    // 生成に成功した際のデバッグ情報を記録する
    debugLog("Advanced template generation completed", {
        type: config.type,
        template: config.template,
        filesCreated: result.filesCreated?.length || 0,
        directoriesCreated: result.directoriesCreated?.length || 0,
        nextSteps: result.nextSteps?.length || 0,
    });
}

// EOF
