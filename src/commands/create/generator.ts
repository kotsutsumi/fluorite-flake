/**
 * プロジェクト生成機能
 */
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import ora, { type Ora } from "ora";

import { debugLog, isDevelopment } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import {
    copyMonorepoTemplates,
    createMonorepoStructure,
    createWebAppPackageJson,
} from "../../utils/monorepo-generator/index.js";
import { generateReadmeContent } from "../../utils/readme-generator/index.js";
import {
    generateExpoGraphQL,
    generateFullStackAdmin,
    generateTauriCrossPlatform,
} from "./template-generators/index.js";
import type {
    GenerationContext,
    TemplateGenerationResult,
} from "./template-generators/types.js";
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
    const isNextJsAdvanced =
        config.type === "nextjs" && config.template === "fullstack-admin";

    // Expo拡張テンプレート
    const isExpoAdvanced =
        config.type === "expo" && config.template === "fullstack-graphql";

    // Tauri拡張テンプレート
    const isTauriAdvanced =
        config.type === "tauri" && config.template === "cross-platform";

    return isNextJsAdvanced || isExpoAdvanced || isTauriAdvanced;
}

/**
 * 拡張テンプレートを生成
 */
async function handleAdvancedTemplate(
    config: ProjectConfig,
    spinner: Ora
): Promise<void> {
    const { create } = getMessages();
    spinner.text = create.spinnerConfiguringTemplate(config.template);

    const targetDirectory = config.monorepo
        ? path.join(config.directory, "apps", "web")
        : config.directory;

    if (config.monorepo) {
        createMonorepoStructure(config);
        copyMonorepoTemplates(config);
        if (!fs.existsSync(targetDirectory)) {
            fs.mkdirSync(targetDirectory, { recursive: true });
        }
    }

    const generationContext: GenerationContext = {
        config,
        useMonorepo: Boolean(config.monorepo),
        targetDirectory,
    };

    // テンプレートタイプに応じて適切なジェネレーターを呼び出し
    let result: TemplateGenerationResult;
    if (config.type === "nextjs") {
        result = await generateFullStackAdmin(generationContext);
    } else if (config.type === "expo") {
        result = await generateExpoGraphQL(generationContext);
    } else if (config.type === "tauri") {
        result = await generateTauriCrossPlatform(generationContext);
    } else {
        throw new Error(
            `Unsupported advanced template: ${config.type}/${config.template}`
        );
    }

    if (!result.success) {
        throw new Error(
            `Template generation failed: ${result.errors?.join(", ")}`
        );
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
 * 通常テンプレートを生成
 */
async function handleStandardTemplate(
    config: ProjectConfig,
    spinner: Ora
): Promise<void> {
    const { create } = getMessages();

    if (config.monorepo) {
        createMonorepoStructure(config);
        copyMonorepoTemplates(config);
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
        fs.writeFileSync(
            packageJsonPath,
            JSON.stringify(packageJsonContent, null, 2)
        );
    }

    // README.mdを作成（多言語対応）
    const readmePath = path.join(config.directory, "README.md");
    const readmeContent = generateReadmeContent(config);
    fs.writeFileSync(readmePath, readmeContent);

    // 依存関係インストールのシミュレーション
    spinner.text = create.spinnerInstallingDeps;
    await new Promise((resolve) => setTimeout(resolve, INSTALL_TIMEOUT_MS));

    // テンプレート設定のシミュレーション
    spinner.text = create.spinnerConfiguringTemplate(config.template);
    await new Promise((resolve) => setTimeout(resolve, CONFIGURE_TIMEOUT_MS));
}

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

        // プロジェクトセットアップ
        spinner.text = create.spinnerSettingUp(config.type);
        await new Promise((resolve) => setTimeout(resolve, SETUP_TIMEOUT_MS));

        // プロジェクトディレクトリを作成
        if (!fs.existsSync(config.directory)) {
            fs.mkdirSync(config.directory, { recursive: true });
        }

        // テンプレート別の処理
        const shouldUseAdvancedTemplate = isAdvancedTemplate(config);
        if (shouldUseAdvancedTemplate) {
            await handleAdvancedTemplate(config, spinner);
        } else {
            await handleStandardTemplate(config, spinner);
        }

        // 成功メッセージの表示
        spinner.succeed(
            chalk.green(create.spinnerSuccess(config.type, config.name))
        );

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

        // 開発モードでのエラーデバッグ
        if (isDevelopment()) {
            debugLog(create.debugGenerationFailure, error);
        }

        throw error;
    }
}

// EOF
