/**
 * プロジェクト生成機能
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora, { type Ora } from "ora";

import { debugLog, isDevelopment } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import { copyDocsTemplate, createDocsPackageJson } from "../../utils/docs-generator/index.js";
import {
    copyMonorepoTemplates,
    createMonorepoStructure,
    createWebAppPackageJson,
} from "../../utils/monorepo-generator/index.js";
import { generateReadmeContent } from "../../utils/readme-generator/index.js";
import { createSpinnerController } from "../../utils/spinner-control/index.js";
import { syncRootScripts } from "../../utils/workspace-manager/index.js";
import {
    generateExpoGraphQL,
    generateExpoFullstackAdmin,
    generateFullStackAdmin,
    generateTauriCrossPlatform,
} from "./template-generators/index.js";
import type { GenerationContext, TemplateGenerationResult } from "./template-generators/types.js";
import type { ProjectConfig } from "./types.js";

// プロジェクト生成タイムアウト定数
const SETUP_TIMEOUT_MS = 1000;
const INSTALL_TIMEOUT_MS = 1500;
const CONFIGURE_TIMEOUT_MS = 800;

/**
 * プロジェクトタイプに応じた開発コマンドを取得
 */
function getDevCommand(type: string): string {
    switch (type) {
        case "nextjs":
            return "next dev";
        case "expo":
            return "expo start";
        case "tauri":
            return "tauri dev";
        default:
            return "npm run dev";
    }
}

/**
 * プロジェクトタイプに応じたビルドコマンドを取得
 */
function getBuildCommand(type: string): string {
    switch (type) {
        case "nextjs":
            return "next build";
        case "expo":
            return "expo build";
        case "tauri":
            return "tauri build";
        default:
            return "npm run build";
    }
}

/**
 * 拡張テンプレートかどうかを判定
 */
function isAdvancedTemplate(config: ProjectConfig): boolean {
    // Next.js拡張テンプレート
    const isNextJsAdvanced = config.type === "nextjs" && config.template === "fullstack-admin";

    // Expo拡張テンプレート
    const isExpoAdvanced =
        config.type === "expo" && (config.template === "fullstack-graphql" || config.template === "fullstack-admin");

    // Tauri拡張テンプレート
    const isTauriAdvanced = config.type === "tauri" && config.template === "cross-platform";

    return isNextJsAdvanced || isExpoAdvanced || isTauriAdvanced;
}

/**
 * monorepoかつdocsプロジェクトが生成された場合の判定
 */
function shouldPostInstall(config: ProjectConfig): boolean {
    // monorepoでない場合は不要
    if (!config.monorepo) {
        return false;
    }

    // docsプロジェクトが生成されていない場合は不要
    if (!config.shouldGenerateDocs) {
        return false;
    }

    // docsディレクトリが実際に存在するかチェック
    const docsPath = path.join(config.directory, "apps", "docs");
    return fs.existsSync(docsPath);
}

/**
 * プロジェクト構造の検証
 */
function validateProjectStructure(projectPath: string): { valid: boolean; reason?: string } {
    try {
        // プロジェクトディレクトリの存在確認
        if (!fs.existsSync(projectPath)) {
            return { valid: false, reason: "プロジェクトディレクトリが存在しません" };
        }

        // package.jsonの存在確認
        const packageJsonPath = path.join(projectPath, "package.json");
        if (!fs.existsSync(packageJsonPath)) {
            return { valid: false, reason: "ルートpackage.jsonが存在しません" };
        }

        // pnpm-workspace.yamlの存在確認
        const workspaceFilePath = path.join(projectPath, "pnpm-workspace.yaml");
        if (!fs.existsSync(workspaceFilePath)) {
            return { valid: false, reason: "pnpm-workspace.yamlが存在しません" };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, reason: `構造検証中にエラーが発生: ${error}` };
    }
}

/**
 * monorepo用の再インストール処理（リトライロジック付き）
 */
async function executePostInstall(projectPath: string, spinner: Ora): Promise<void> {
    const { create } = getMessages();
    const maxRetries = 2;
    let attempt = 0;

    // 事前検証
    const validation = validateProjectStructure(projectPath);
    if (!validation.valid) {
        debugLog("Project structure validation failed", { reason: validation.reason });
        console.warn(chalk.yellow(`⚠️ プロジェクト構造の検証失敗: ${validation.reason}`));
        console.warn(chalk.yellow(create.postInstallFailed));
        return;
    }

    while (attempt <= maxRetries) {
        try {
            // スピナーメッセージを更新
            const retryMessage = attempt > 0 ? ` (${attempt + 1}/${maxRetries + 1}回目)` : "";
            spinner.text = `${create.spinnerPostInstalling}${retryMessage}`;

            debugLog("Starting post-install for monorepo", {
                projectPath,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
            });

            // pnpm install を実行
            execSync("pnpm install", {
                cwd: projectPath,
                stdio: isDevelopment() ? "inherit" : "pipe",
                timeout: 120000, // 2分でタイムアウト
            });

            debugLog("Post-install completed successfully", { attempt: attempt + 1 });
            return; // 成功時は即座にreturn
        } catch (error) {
            attempt++;
            debugLog("Post-install failed", {
                error,
                attempt,
                willRetry: attempt <= maxRetries,
            });

            // 最後の試行でも失敗した場合
            if (attempt > maxRetries) {
                // エラーが発生しても処理を継続（警告として表示）
                if (isDevelopment()) {
                    console.warn(chalk.yellow(create.postInstallFailed));
                    console.warn(chalk.gray(`詳細 (${maxRetries + 1}回試行後): ${error}`));
                } else {
                    console.warn(chalk.yellow(create.postInstallFailed));
                }

                // 手動実行のヒントを表示
                console.warn(chalk.cyan("💡 手動で依存関係をインストールする場合:"));
                console.warn(chalk.cyan(`   cd ${path.relative(process.cwd(), projectPath)}`));
                console.warn(chalk.cyan("   pnpm install"));
                break;
            }

            // リトライの場合は少し待機
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

/**
 * 拡張テンプレートを生成
 */
async function handleAdvancedTemplate(config: ProjectConfig, spinner: Ora): Promise<void> {
    const { create } = getMessages();
    spinner.text = create.spinnerConfiguringTemplate(config.template);

    const targetDirectory = config.monorepo ? path.join(config.directory, "apps", "web") : config.directory;

    if (config.monorepo) {
        createMonorepoStructure(config);
        copyMonorepoTemplates(config, config.pnpmVersion);
        if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory, { recursive: true });
        }
    }

    const generationContext: GenerationContext = {
        config,
        useMonorepo: Boolean(config.monorepo),
        targetDirectory,
        databaseConfig: config.databaseConfig,
        databaseCredentials: config.databaseCredentials,
        blobConfig: config.blobConfig,
    };

    // スピナー制御を作成
    const spinnerController = createSpinnerController(spinner);

    // テンプレートタイプに応じて適切なジェネレーターを呼び出し
    let result: TemplateGenerationResult;
    if (config.type === "nextjs") {
        result = await generateFullStackAdmin(generationContext, spinnerController);
    } else if (config.type === "expo") {
        if (config.template === "fullstack-graphql") {
            result = await generateExpoGraphQL(generationContext);
        } else if (config.template === "fullstack-admin") {
            result = await generateExpoFullstackAdmin(generationContext);
        } else {
            throw new Error(`Unsupported expo template: ${config.template}`);
        }
    } else if (config.type === "tauri") {
        result = await generateTauriCrossPlatform(generationContext);
    } else {
        throw new Error(`Unsupported advanced template: ${config.type}/${config.template}`);
    }

    if (!result.success) {
        throw new Error(`Template generation failed: ${result.errors?.join(", ")}`);
    }

    debugLog("Advanced template generation completed", {
        type: config.type,
        template: config.template,
        filesCreated: result.filesCreated?.length || 0,
        directoriesCreated: result.directoriesCreated?.length || 0,
        nextSteps: result.nextSteps?.length || 0,
    });
}

/**
 * ドキュメント生成用ディレクトリ検証
 */
function validateDocsDirectory(config: ProjectConfig): { valid: boolean; reason?: string } {
    try {
        const docsPath = config.monorepo
            ? path.join(config.directory, "apps", "docs")
            : path.join(config.directory, "docs");

        // 親ディレクトリの存在確認
        const parentDir = path.dirname(docsPath);
        if (!fs.existsSync(parentDir)) {
            return { valid: false, reason: `親ディレクトリが存在しません: ${parentDir}` };
        }

        // 書き込み権限の確認
        try {
            fs.accessSync(parentDir, fs.constants.W_OK);
        } catch {
            return { valid: false, reason: `ディレクトリへの書き込み権限がありません: ${parentDir}` };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, reason: `ディレクトリ検証中にエラーが発生: ${error}` };
    }
}

/**
 * ドキュメントサイトを生成（エラーリカバリ付き）
 */
async function handleDocsGeneration(config: ProjectConfig, spinner: Ora): Promise<void> {
    if (!config.shouldGenerateDocs) {
        return;
    }

    debugLog("Starting documentation generation", {
        projectName: config.name,
        isMonorepo: config.monorepo,
        outputPath: config.directory,
    });

    // 事前検証
    const validation = validateDocsDirectory(config);
    if (!validation.valid) {
        const errorMessage = `ドキュメント生成の事前検証失敗: ${validation.reason}`;
        debugLog("Documentation validation failed", { reason: validation.reason });
        console.warn(chalk.yellow(`⚠️ ${errorMessage}`));
        console.warn(chalk.yellow("ドキュメント生成をスキップします"));
        return;
    }

    spinner.text = "📚 Nextraドキュメントサイトを生成中...";
    let templateCopySuccess = false;
    let packageJsonSuccess = false;

    try {
        // Nextraテンプレートをコピー
        spinner.text = "📚 ドキュメントテンプレートをコピー中...";
        const docsTemplateOptions = {
            projectName: config.name,
            outputPath: config.directory,
            isMonorepo: config.monorepo,
            title: `${config.name} Documentation`,
            description: `Documentation for ${config.name}`,
        };

        templateCopySuccess = await copyDocsTemplate(docsTemplateOptions);
        if (!templateCopySuccess) {
            throw new Error("ドキュメントテンプレートのコピーに失敗しました");
        }

        debugLog("Documentation template copied successfully");

        // package.jsonを生成
        spinner.text = "📦 ドキュメント用package.jsonを生成中...";
        const packageJsonOptions = {
            projectName: config.name,
            outputPath: config.directory,
            isMonorepo: config.monorepo,
            reactVersion: "^19.1.0",
            nextVersion: "^15.5.4",
            nextraVersion: "^4.6.0",
        };

        packageJsonSuccess = await createDocsPackageJson(packageJsonOptions);
        if (!packageJsonSuccess) {
            throw new Error("ドキュメント用package.jsonの生成に失敗しました");
        }

        debugLog("Documentation generation completed successfully", {
            projectName: config.name,
            isMonorepo: config.monorepo,
        });
    } catch (error) {
        debugLog("Documentation generation failed", {
            error,
            templateCopySuccess,
            packageJsonSuccess,
        });

        // 部分的な成功状態のクリーンアップ
        const docsPath = config.monorepo
            ? path.join(config.directory, "apps", "docs")
            : path.join(config.directory, "docs");

        if (fs.existsSync(docsPath)) {
            try {
                fs.rmSync(docsPath, { recursive: true, force: true });
                debugLog("Cleaned up partial documentation directory", { docsPath });
            } catch (cleanupError) {
                debugLog("Failed to cleanup documentation directory", { cleanupError, docsPath });
            }
        }

        // エラーを警告として処理し、プロジェクト生成を継続
        console.warn(chalk.yellow("⚠️ ドキュメント生成中にエラーが発生しました"));
        console.warn(chalk.yellow("プロジェクト生成は継続されますが、ドキュメントは生成されませんでした"));

        if (isDevelopment()) {
            console.warn(chalk.gray(`詳細: ${error}`));
        }

        // 手動でドキュメントを追加する方法を案内
        console.warn(chalk.cyan("💡 後でドキュメントを追加する場合:"));
        if (config.monorepo) {
            console.warn(chalk.cyan("   pnpm create next-app@latest apps/docs --example blog-starter"));
        } else {
            console.warn(chalk.cyan("   pnpm create next-app@latest docs --example blog-starter"));
        }
    }
}

/**
 * 通常テンプレートを生成
 */
async function handleStandardTemplate(config: ProjectConfig, spinner: Ora): Promise<void> {
    const { create } = getMessages();

    if (config.monorepo) {
        createMonorepoStructure(config);
        copyMonorepoTemplates(config, config.pnpmVersion);
        createWebAppPackageJson(config);
    } else {
        const packageJsonPath = path.join(config.directory, "package.json");
        const packageJsonContent = {
            name: config.name,
            version: "0.1.0",
            description: `A ${config.type} project created with Fluorite Flake`,
            scripts: {
                dev: getDevCommand(config.type),
                build: getBuildCommand(config.type),
            },
            dependencies: {},
            devDependencies: {},
        };
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    }

    // README.mdを作成（多言語対応）
    const readmePath = path.join(config.directory, "README.md");
    const readmeContent = generateReadmeContent(config);
    fs.writeFileSync(readmePath, readmeContent);

    // .gitignoreを作成（Next.jsの場合）
    if (config.type === "nextjs") {
        const gitignorePath = path.join(config.directory, ".gitignore");
        const gitignoreTemplatePath = path.join(
            path.dirname(new URL(import.meta.url).pathname),
            "../../../templates/shared/nextjs/gitignore"
        );

        try {
            const gitignoreContent = fs.readFileSync(gitignoreTemplatePath, "utf8");
            fs.writeFileSync(gitignorePath, gitignoreContent);
        } catch (error) {
            debugLog("Warning: Could not copy .gitignore template", { error });
            // フォールバック：基本的な.gitignoreを作成
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
`;
            fs.writeFileSync(gitignorePath, basicGitignore);
        }
    }

    // 依存関係インストールのシミュレーション
    spinner.text = create.spinnerInstallingDeps;
    await new Promise((resolve) => setTimeout(resolve, INSTALL_TIMEOUT_MS));

    // テンプレート設定のシミュレーション
    spinner.text = create.spinnerConfiguringTemplate(config.template);
    await new Promise((resolve) => setTimeout(resolve, CONFIGURE_TIMEOUT_MS));
}

/**
 * プロジェクト生成の事前検証
 */
function validateProjectGeneration(config: ProjectConfig): { valid: boolean; reason?: string } {
    try {
        // ディレクトリ名の検証
        if (!config.directory || config.directory.trim() === "") {
            return { valid: false, reason: "プロジェクトディレクトリが指定されていません" };
        }

        // 特殊文字のチェック
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(config.directory)) {
            return { valid: false, reason: "プロジェクトディレクトリ名に無効な文字が含まれています" };
        }

        // 親ディレクトリの書き込み権限確認
        const parentDir = path.dirname(path.resolve(config.directory));
        try {
            fs.accessSync(parentDir, fs.constants.W_OK);
        } catch {
            return { valid: false, reason: `親ディレクトリへの書き込み権限がありません: ${parentDir}` };
        }

        // プロジェクト名の検証
        if (!config.name || config.name.trim() === "") {
            return { valid: false, reason: "プロジェクト名が指定されていません" };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, reason: `事前検証中にエラーが発生: ${error}` };
    }
}

/**
 * プロジェクト生成失敗時のクリーンアップ
 */
async function cleanupFailedProject(config: ProjectConfig): Promise<void> {
    try {
        if (fs.existsSync(config.directory)) {
            debugLog("Cleaning up failed project directory", { directory: config.directory });
            fs.rmSync(config.directory, { recursive: true, force: true });
            debugLog("Cleanup completed successfully");
        }
    } catch (cleanupError) {
        debugLog("Failed to cleanup project directory", { cleanupError, directory: config.directory });
        console.warn(chalk.yellow(`⚠️ プロジェクトディレクトリのクリーンアップに失敗: ${config.directory}`));
        console.warn(chalk.yellow("手動でディレクトリを削除してください"));
    }
}

/**
 * 設定に基づいてプロジェクトを生成（包括的エラーハンドリング付き）
 */
export async function generateProject(config: ProjectConfig): Promise<void> {
    const { create } = getMessages();
    const spinner = ora(create.spinnerCreating(config.type, config.name)).start();
    let projectCreated = false;
    let templatesCompleted = false;
    let docsCompleted = false;

    try {
        debugLog(create.debugProjectConfig, config);

        // 事前検証
        const validation = validateProjectGeneration(config);
        if (!validation.valid) {
            throw new Error(`プロジェクト生成の事前検証失敗: ${validation.reason}`);
        }

        // プロジェクトセットアップ
        spinner.text = create.spinnerSettingUp(config.type);
        await new Promise((resolve) => setTimeout(resolve, SETUP_TIMEOUT_MS));

        // プロジェクトディレクトリを作成
        if (!fs.existsSync(config.directory)) {
            fs.mkdirSync(config.directory, { recursive: true });
            projectCreated = true;
            debugLog("Project directory created successfully", { directory: config.directory });
        }

        // テンプレート別の処理
        const shouldUseAdvancedTemplate = isAdvancedTemplate(config);
        if (shouldUseAdvancedTemplate) {
            await handleAdvancedTemplate(config, spinner);
        } else {
            await handleStandardTemplate(config, spinner);
        }
        templatesCompleted = true;
        debugLog("Template generation completed successfully");

        // ドキュメント生成処理
        await handleDocsGeneration(config, spinner);
        docsCompleted = true;

        if (config.monorepo) {
            spinner.text = "🔧 ワークスペーススクリプトを同期中...";
            await syncRootScripts(config.directory);
            debugLog("Root scripts synchronized successfully");
        }

        // monorepoでdocsプロジェクトが生成された場合は再インストール実行
        if (shouldPostInstall(config)) {
            await executePostInstall(config.directory, spinner);
        }

        // 成功メッセージの表示
        spinner.succeed(chalk.green(create.spinnerSuccess(config.type, config.name)));

        // プロジェクトの場所を表示
        const currentDir = process.cwd();
        const projectPath = path.resolve(currentDir, config.directory);
        console.log(chalk.cyan(`📂 プロジェクトの場所: ${projectPath}`));

        // 開発モードでのデバッグログ
        if (isDevelopment()) {
            debugLog(create.debugGenerationSuccess);
        }
    } catch (error) {
        // エラー処理
        spinner.fail(chalk.red(create.spinnerFailure));

        debugLog("Project generation failed", {
            error,
            projectCreated,
            templatesCompleted,
            docsCompleted,
            config,
        });

        // エラーの詳細情報を表示
        if (error instanceof Error) {
            console.error(chalk.red(`❌ ${error.message}`));
        } else {
            console.error(chalk.red(`❌ 予期しないエラーが発生しました: ${error}`));
        }

        // 開発モードでのエラーデバッグ
        if (isDevelopment()) {
            debugLog(create.debugGenerationFailure, error);
            console.error(chalk.gray("スタックトレース:"));
            console.error(chalk.gray(error instanceof Error ? error.stack : String(error)));
        }

        // 部分的に作成されたプロジェクトのクリーンアップ
        if (projectCreated && !templatesCompleted) {
            console.warn(chalk.yellow("部分的に作成されたプロジェクトをクリーンアップしています..."));
            await cleanupFailedProject(config);
        }

        // エラー解決のヒントを提供
        console.error(chalk.cyan("\n💡 トラブルシューティング:"));
        console.error(chalk.cyan("1. ディスクの空き容量を確認してください"));
        console.error(chalk.cyan("2. プロジェクト名と場所に特殊文字が含まれていないか確認してください"));
        console.error(chalk.cyan("3. 必要な権限があることを確認してください"));
        console.error(chalk.cyan("4. 開発モード（NODE_ENV=development）で詳細情報を確認してください"));

        throw error;
    }
}

// EOF
