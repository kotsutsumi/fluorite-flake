/**
 * createコマンドとnewコマンドの定義
 */

import { join } from "node:path";
import { defineCommand } from "citty";

import { debugLog } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import { validatePnpmWithDetails } from "../../utils/pnpm-validator/index.js";
import {
    confirmDirectoryOverwrite,
    promptForDatabase,
    promptForProjectName,
} from "../../utils/user-input/index.js";
import type { BlobConfiguration } from "../../utils/vercel-cli/blob-types.js";
import { createProjectConfig } from "./config.js";
import type { ConfirmationInputs } from "./confirmation/index.js";
import { displayConfirmation } from "./confirmation/index.js";
import { collectDatabaseConfig } from "./database-provisioning/prompts.js";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
} from "./database-provisioning/types.js";
import { executeProvisioning } from "./execution/index.js";
import { generateProject } from "./generator.js";
import { collectBlobConfiguration } from "./prompts/blob-prompts.js";
import { selectProjectTemplate } from "./template-selector/index.js";
import type { DatabaseType, ProjectType } from "./types.js";
import {
    hasDatabaseFeature,
    showInvalidDatabaseError,
    validateDatabase,
    validateProjectType,
} from "./validators.js";

const ADVANCED_TEMPLATES: Partial<Record<ProjectType, readonly string[]>> = {
    nextjs: ["fullstack-admin"],
    expo: ["fullstack-graphql"],
    tauri: ["desktop-admin", "cross-platform"],
};

// 初期メッセージを取得
const initialMessages = getMessages();

/**
 * Tursoクラウドデータベースにテーブルを作成する
 */
async function createTursoTables(
    config: any,
    credentials: DatabaseCredentials
): Promise<void> {
    try {
        const { createTablesInTursoDatabases, seedTursoDatabases } =
            await import("../../utils/turso-cli/provisioning.js");

        // アプリケーションのディレクトリを計算
        const appDirectory = config.monorepo
            ? join(config.directory, "apps", "web")
            : config.directory;

        // 各環境のTursoクラウドデータベースにテーブルを作成
        await createTablesInTursoDatabases(appDirectory, credentials, [
            "dev",
            "staging",
            "prod",
        ]);

        // dev環境とstaging環境にシードデータを投入
        await seedTursoDatabases(appDirectory, credentials, ["dev", "staging"]);

        console.log("✅ Tursoクラウドデータベースのテーブル作成が完了しました");
    } catch (error) {
        console.error(
            `❌ Tursoクラウドデータベースのテーブル作成に失敗: ${error instanceof Error ? error.message : error}`
        );
        throw error;
    }
}

/**
 * モノレポフラグが明示的に指定されているかをチェック
 */
function hasExplicitMonorepoFlag(rawArgs: unknown): boolean {
    const rawArgList = Array.isArray(rawArgs) ? rawArgs : [];
    return rawArgList.some(
        (arg) =>
            ["--monorepo", "--no-monorepo", "-m"].some(
                (flag) => arg === flag || arg.startsWith(`${flag}=`)
            ) || arg.startsWith("--monorepo=")
    );
}

/**
 * データベース選択を決定
 */
async function determineDatabaseSelection(
    args: { database?: string },
    template: string | undefined
): Promise<DatabaseType | undefined> {
    let database: DatabaseType | undefined = args.database as DatabaseType;

    // データベースが指定されているがバリデーションに失敗した場合
    if (args.database && !validateDatabase(args.database)) {
        showInvalidDatabaseError(args.database);
        process.exit(1);
    }

    // データベースが指定されていない場合で、テンプレートがデータベース機能を持つ場合はプロンプト表示
    if (!database && template && hasDatabaseFeature(template)) {
        database = await promptForDatabase();
        if (database === undefined) {
            process.exit(0); // ユーザーがキャンセルした場合
        }
    }

    return database;
}

/**
 * 🔄 新しい3段階フロー: 入力収集のみ（副作用なし）
 * データベースとBlob設定を収集するが、実際のプロビジョニングは行わない
 */
async function collectDatabaseAndBlobConfiguration(
    args: { database?: string },
    template: string | undefined,
    projectName: string
): Promise<{
    database: DatabaseType | undefined;
    databaseConfig: DatabaseProvisioningConfig | undefined;
    blobConfig: BlobConfiguration | undefined;
}> {
    console.log("📋 設定を収集中... (プロビジョニングは確認後に実行されます)");

    // データベース選択の決定
    const database = await determineDatabaseSelection(args, template);

    let databaseConfig: DatabaseProvisioningConfig | undefined;

    // データベースが選択された場合、設定のみを収集（プロビジョニングは後で実行）
    if (database) {
        // SQLite の場合はプロビジョニング不要なのでスキップ
        if (database === "sqlite") {
            console.log(
                "✅ ローカル SQLite を選択しました（プロビジョニング不要）"
            );
            databaseConfig = undefined;
        } else {
            try {
                databaseConfig = await collectDatabaseConfig(
                    projectName,
                    database
                );
                console.log(`✅ データベース設定を収集しました (${database})`);
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "DATABASE_PROVISIONING_CANCELLED"
                ) {
                    console.warn(
                        "⚠️ データベース設定をキャンセルしました。処理を終了します。"
                    );
                    process.exit(0);
                }

                console.error(
                    `❌ データベース設定収集に失敗しました: ${
                        error instanceof Error ? error.message : error
                    }`
                );
                process.exit(1);
            }
        }
    }

    // Blob設定の収集（Next.jsフルスタックテンプレートの場合のみ）
    let blobConfig: BlobConfiguration | undefined;
    const shouldConfigureBlob = (
        projectType: string,
        templateName: string | undefined
    ) => projectType === "nextjs" && templateName === "fullstack-admin";

    if (template && shouldConfigureBlob("nextjs", template)) {
        try {
            const config = await collectBlobConfiguration(projectName);
            blobConfig = config || undefined;
            if (blobConfig) {
                console.log(
                    `✅ Vercel Blob設定を収集しました: ${blobConfig.storeName}`
                );
            }
        } catch (error) {
            console.warn(
                `⚠️ Vercel Blob設定をスキップします: ${error instanceof Error ? error.message : error}`
            );
        }
    }

    return { database, databaseConfig, blobConfig };
}

/**
 * ユーザー入力の収集（副作用なし）
 */
async function collectUserInputs(
    args: {
        name?: string;
        type?: string;
        template?: string;
        database?: string;
        dir?: string;
        simple?: boolean;
        monorepo?: boolean;
    },
    rawArgs: unknown
): Promise<ConfirmationInputs> {
    // プロジェクト名の取得
    let projectName = args.name;
    if (!projectName) {
        projectName = await promptForProjectName();
    }

    // プロジェクトタイプとテンプレートの決定
    const hasExplicitMonorepo = hasExplicitMonorepoFlag(rawArgs);
    const { projectType, template, monorepoPreference } =
        await determineProjectTypeAndTemplate(args, hasExplicitMonorepo);

    // データベースとBlob設定の収集（プロビジョニングなし）
    const { database, databaseConfig, blobConfig } =
        await collectDatabaseAndBlobConfiguration(args, template, projectName);

    // モノレポ設定の最終決定
    const finalMonorepoPreference = args.simple
        ? false
        : (monorepoPreference ?? args.monorepo ?? true);

    return {
        projectName,
        projectType,
        template,
        database,
        databaseConfig,
        blobConfig,
        monorepoPreference: finalMonorepoPreference,
        outputDirectory: args.dir,
    };
}

/**
 * プロジェクトタイプとテンプレートを決定
 */
async function determineProjectTypeAndTemplate(
    args: {
        type?: string;
        template?: string;
        simple?: boolean;
        monorepo?: boolean;
    },
    hasExplicitMonorepo: boolean
): Promise<{
    projectType: string;
    template: string | undefined;
    monorepoPreference: boolean | undefined;
}> {
    let projectType = args.type;
    let template = args.template;
    let monorepoPreference: boolean | undefined;

    if (args.simple) {
        monorepoPreference = false;
    } else if (hasExplicitMonorepo) {
        monorepoPreference = Boolean(args.monorepo);
    }

    const shouldPromptForSelection = !(projectType && template);
    if (shouldPromptForSelection) {
        const initialProjectType =
            projectType && validateProjectType(projectType)
                ? projectType
                : undefined;

        const selection = await selectProjectTemplate(initialProjectType, {
            templateFilter: ({ projectType: selectedType, templateKey }) => {
                const allowedTemplates = ADVANCED_TEMPLATES[selectedType];
                if (!allowedTemplates) {
                    return true;
                }
                return allowedTemplates.includes(templateKey);
            },
            disableMonorepoPrompt: true,
        });
        if (!selection) {
            process.exit(0);
        }

        projectType = selection.projectType;
        template = selection.template;

        if (
            !(args.simple || hasExplicitMonorepo) &&
            monorepoPreference === undefined
        ) {
            monorepoPreference = selection.useMonorepo;
        }
    }

    return {
        projectType: projectType ?? "nextjs",
        template,
        monorepoPreference,
    };
}

/**
 * createAndValidateConfig関数のオプション型
 */
type CreateAndValidateConfigOptions = {
    projectType: string;
    projectName: string;
    template: string | undefined;
    args: { dir?: string; force?: boolean };
    isMonorepoMode: boolean;
    database?: DatabaseType;
    databaseConfig?: DatabaseProvisioningConfig;
    databaseCredentials?: DatabaseCredentials;
    blobConfig?: BlobConfiguration;
    pnpmVersion?: string;
};

/**
 * プロジェクト設定を作成し検証
 */
async function createAndValidateConfig(
    options: CreateAndValidateConfigOptions
) {
    const {
        projectType,
        projectName,
        template,
        args,
        isMonorepoMode,
        database,
        databaseConfig,
        databaseCredentials,
        blobConfig,
        pnpmVersion,
    } = options;
    const config = createProjectConfig(projectType, {
        name: projectName,
        template,
        dir: args.dir,
        force: args.force,
        monorepo: isMonorepoMode,
        database,
    });

    if (!config) {
        process.exit(1);
    }

    if (databaseConfig) {
        config.databaseConfig = databaseConfig;
    }
    if (databaseCredentials) {
        config.databaseCredentials = databaseCredentials;
    }
    if (blobConfig) {
        config.blobConfig = blobConfig;
    }
    if (pnpmVersion) {
        config.pnpmVersion = pnpmVersion;
    }

    if (!config.force) {
        const shouldProceed = await confirmDirectoryOverwrite(config.directory);
        if (!shouldProceed) {
            process.exit(0);
        }
    }

    return config;
}

/**
 * createコマンドの定義
 */
export const createCommand = defineCommand({
    meta: {
        name: "create",
        description: initialMessages.create.commandDescription,
    },
    args: {
        name: {
            type: "positional",
            description: initialMessages.create.args.name,
            required: false,
        },
        type: {
            type: "string",
            description: initialMessages.create.args.type,
            alias: "t",
        },
        template: {
            type: "string",
            description: initialMessages.create.args.template,
            alias: "T",
        },
        dir: {
            type: "string",
            description: initialMessages.create.args.dir,
            alias: "d",
        },
        force: {
            type: "boolean",
            description: initialMessages.create.args.force,
            alias: "f",
        },
        monorepo: {
            type: "boolean",
            description: initialMessages.create.args.monorepo,
            alias: "m",
            default: true,
        },
        simple: {
            type: "boolean",
            description: "Create a simple project (non-monorepo structure)",
            alias: "s",
        },
        database: {
            type: "string",
            description: initialMessages.create.args.database,
            alias: "db",
        },
    },
    async run({ args }) {
        const { create } = getMessages();
        debugLog(create.debugCommandCalled, args);

        // monorepoモードの場合はpnpmバリデーションを実行
        const resolvedProjectType = args.type ?? "nextjs";
        const isMonorepoMode = args.simple ? false : (args.monorepo ?? true);
        let pnpmVersion: string | undefined;
        if (isMonorepoMode) {
            const pnpmValidation = validatePnpmWithDetails();
            if (!pnpmValidation.isValid) {
                process.exit(1);
            }
            pnpmVersion = pnpmValidation.version;
        }

        // 🔄 新しい3段階フロー: 1. 入力収集（副作用なし）
        const inputs = await collectUserInputs(
            {
                ...args,
                type: resolvedProjectType,
                monorepo: isMonorepoMode,
            },
            []
        );

        // pnpmバリデーション（モノレポモードの場合）
        if (inputs.monorepoPreference && !pnpmVersion) {
            const pnpmValidation = validatePnpmWithDetails();
            if (!pnpmValidation.isValid) {
                process.exit(1);
            }
            pnpmVersion = pnpmValidation.version;
        }

        // 🔄 新しい3段階フロー: 2. 確認フェーズ
        const confirmed = await displayConfirmation(inputs);
        if (!confirmed) {
            process.exit(0); // ユーザーがキャンセル
        }

        // 🔄 新しい3段階フロー: 3. 実行フェーズ（副作用あり）
        let databaseCredentials: DatabaseCredentials | undefined;
        let database: DatabaseType | undefined;

        // プロビジョニング実行
        if (inputs.databaseConfig) {
            console.log("🚀 プロビジョニングを実行しています...");
            const result = await executeProvisioning(inputs);

            if (!result.success) {
                console.error(
                    `❌ プロビジョニングに失敗しました: ${result.error}`
                );
                process.exit(1);
            }

            databaseCredentials = result.databaseCredentials;
            database = inputs.databaseConfig.type;
        }

        // プロジェクト設定の作成と検証
        const config = await createAndValidateConfig({
            projectType: inputs.projectType,
            projectName: inputs.projectName,
            template: inputs.template,
            args,
            isMonorepoMode: inputs.monorepoPreference,
            database: database ?? inputs.database, // SQLite経路でもdatabaseが設定されるよう修正
            databaseConfig: inputs.databaseConfig,
            databaseCredentials,
            blobConfig: inputs.blobConfig,
            pnpmVersion,
        });

        // 既存ディレクトリの確認（--forceフラグがない場合）
        if (!args.force) {
            const shouldProceed = await confirmDirectoryOverwrite(
                config.directory
            );
            if (!shouldProceed) {
                process.exit(0); // 操作がキャンセルされた場合は正常終了
            }
        }

        try {
            // プロジェクトを生成
            await generateProject(config);

            // データベースにテーブルを作成（Tursoクラウドデータベースにテーブル作成）
            if (databaseCredentials && database === "turso") {
                console.log("🗄️ Tursoクラウドデータベースにテーブルを作成中...");
                await createTursoTables(config, databaseCredentials);
            }

            // 開発モードでのデバッグ - コマンド完了を明示
            debugLog("Create command completed successfully");
        } catch (error) {
            // 生成エラーの場合はエラー終了
            console.error("❌ プロジェクトの作成に失敗しました");
            if (error instanceof Error) {
                console.error(`🐛 デバッグ: ${error.message}`);
                debugLog("Detailed error:", error);
            } else {
                console.error(`🐛 デバッグ: ${String(error)}`);
                debugLog("Detailed error:", error);
            }
            process.exit(1);
        }

        // 正常終了 - process.exit(0) を明示的に呼び出してメインコマンドの実行を防ぐ
        process.exit(0);
    },
});

/**
 * newコマンド（createのエイリアス）
 */
export const newCommand = defineCommand({
    meta: {
        name: "new",
        description: initialMessages.create.newCommandDescription,
    },
    args: createCommand.args,
    async run(context) {
        const { args, rawArgs } = context;
        const { create } = getMessages();
        debugLog(create.debugCommandCalled, args);

        // 🔄 新しい3段階フロー: 1. 入力収集（副作用なし）
        const inputs = await collectUserInputs(args, rawArgs);

        // pnpmバリデーション（モノレポモードの場合）
        let pnpmVersion: string | undefined;
        if (inputs.monorepoPreference) {
            const pnpmValidation = validatePnpmWithDetails();
            if (!pnpmValidation.isValid) {
                process.exit(1);
            }
            pnpmVersion = pnpmValidation.version;
        }

        // 🔄 新しい3段階フロー: 2. 確認フェーズ
        const confirmed = await displayConfirmation(inputs);
        if (!confirmed) {
            process.exit(0); // ユーザーがキャンセル
        }

        // 🔄 新しい3段階フロー: 3. 実行フェーズ（副作用あり）
        let databaseCredentials: DatabaseCredentials | undefined;
        let database: DatabaseType | undefined;

        // プロビジョニング実行
        if (inputs.databaseConfig) {
            console.log("🚀 プロビジョニングを実行しています...");
            const result = await executeProvisioning(inputs);

            if (!result.success) {
                console.error(
                    `❌ プロビジョニングに失敗しました: ${result.error}`
                );
                process.exit(1);
            }

            databaseCredentials = result.databaseCredentials;
            database = inputs.databaseConfig.type;
        }

        // プロジェクト設定の作成と検証
        const config = await createAndValidateConfig({
            projectType: inputs.projectType,
            projectName: inputs.projectName,
            template: inputs.template,
            args,
            isMonorepoMode: inputs.monorepoPreference,
            database: database ?? inputs.database, // SQLite経路でもdatabaseが設定されるよう修正
            databaseConfig: inputs.databaseConfig,
            databaseCredentials,
            blobConfig: inputs.blobConfig,
            pnpmVersion,
        });

        // プロジェクトの生成
        try {
            await generateProject(config);

            // データベースにテーブルを作成（Tursoクラウドデータベースにテーブル作成）
            if (databaseCredentials && database === "turso") {
                console.log("🗄️ Tursoクラウドデータベースにテーブルを作成中...");
                await createTursoTables(config, databaseCredentials);
            }

            debugLog("New command completed successfully");
        } catch (error) {
            console.error("❌ プロジェクトの作成に失敗しました");
            if (error instanceof Error) {
                console.error(`🐛 デバッグ: ${error.message}`);
                debugLog("Detailed error:", error);
            } else {
                console.error(`🐛 デバッグ: ${String(error)}`);
                debugLog("Detailed error:", error);
            }
            process.exit(1);
        }

        process.exit(0);
    },
});

// EOF
