/**
 * 標準テンプレート生成を担当するモジュール
 */
import fs from "node:fs"; // ファイル操作ユーティリティ
import path from "node:path"; // パス操作ユーティリティ

import { debugLog } from "../../../debug.js"; // デバッグログ出力関数
import { getMessages } from "../../../i18n.js"; // 多言語メッセージ取得関数
import {
    copyMonorepoTemplates,
    createMonorepoStructure,
    createWebAppPackageJson,
} from "../../../utils/monorepo-generator/index.js"; // モノレポ構築ユーティリティ
import { generateReadmeContent } from "../../../utils/readme-generator/index.js"; // README生成ユーティリティ
import type { Ora } from "ora"; // スピナー型定義

import { CONFIGURE_TIMEOUT_MS, INSTALL_TIMEOUT_MS } from "./constants.js"; // 待機時間定数
import { getBuildCommand, getDevCommand } from "./command-mapping.js"; // コマンド解決ユーティリティ
import { getFrameworkDependencies } from "./framework-dependencies.js"; // フレームワーク依存関係取得
import type { ProjectConfig } from "../types.js"; // プロジェクト設定型

/**
 * 標準テンプレートを生成するメイン処理
 */
export async function handleStandardTemplate(config: ProjectConfig, spinner: Ora): Promise<void> {
    const { create } = getMessages(); // createセクションのメッセージを取得する

    if (config.monorepo) {
        createMonorepoStructure(config); // モノレポディレクトリを構築する
        copyMonorepoTemplates(config, config.pnpmVersion); // 共通テンプレートをコピーする
        createWebAppPackageJson(config); // Webアプリ用のpackage.jsonを生成する
    } else {
        // フレームワーク別の依存関係を取得する
        const frameworkDeps = getFrameworkDependencies(config.type);

        const packageJsonPath = path.join(config.directory, "package.json"); // package.jsonの出力先パスを決定する
        const packageJsonContent = {
            name: config.name, // プロジェクト名
            version: "0.1.0", // 初期バージョン
            description: `A ${config.type} project created with Fluorite Flake`, // 説明文
            scripts: {
                dev: getDevCommand(config.type), // 開発コマンド
                build: getBuildCommand(config.type), // ビルドコマンド
            },
            dependencies: frameworkDeps.dependencies, // フレームワーク固有の依存関係
            devDependencies: frameworkDeps.devDependencies, // フレームワーク固有の開発依存関係
        };
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2)); // package.jsonを書き込む
    }

    // README.mdファイルを生成する
    const readmePath = path.join(config.directory, "README.md"); // READMEの出力先
    const readmeContent = generateReadmeContent(config); // README内容を生成する
    fs.writeFileSync(readmePath, readmeContent); // READMEを保存する

    // Next.jsテンプレートの場合に.gitignoreを配置する
    if (config.type === "nextjs") {
        const gitignorePath = path.join(config.directory, ".gitignore"); // .gitignoreの出力先を組み立てる
        const gitignoreTemplatePath = path.join(
            path.dirname(new URL(import.meta.url).pathname), // 現在のモジュールパスを取得する
            "../../../../templates/shared/nextjs/gitignore" // 共有テンプレートの場所（ジェネレーターディレクトリから4階層上）
        );

        try {
            const gitignoreContent = fs.readFileSync(gitignoreTemplatePath, "utf8"); // テンプレート内容を読み込む
            fs.writeFileSync(gitignorePath, gitignoreContent); // .gitignoreを出力する
        } catch (error) {
            debugLog("Warning: Could not copy .gitignore template", { error }); // エラー時はデバッグログに記録
            const basicGitignore = `# Dependencies
node_modules/

# Next.js
.next/
out/

# Environment variables
.env
.env.local

# Build output
build/
dist/

# Logs
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Vercel
.vercel

# macOS
.DS_Store
`; // フォールバック用の簡易.gitignore
            fs.writeFileSync(gitignorePath, basicGitignore); // フォールバックを保存する
        }
    }

    // 依存関係インストールのシミュレーションを行う
    spinner.text = create.spinnerInstallingDeps; // スピナーを更新する
    await new Promise((resolve) => setTimeout(resolve, INSTALL_TIMEOUT_MS)); // 擬似的な待機を行う

    // テンプレート設定のシミュレーションを行う
    spinner.text = create.spinnerConfiguringTemplate(config.template); // スピナーを更新する
    await new Promise((resolve) => setTimeout(resolve, CONFIGURE_TIMEOUT_MS)); // 擬似的な待機を行う
}

// EOF
