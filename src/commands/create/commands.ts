/**
 * createコマンドとnewコマンドの定義
 */

import { join } from "node:path";
import { defineCommand } from "citty";

import { debugLog } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import { validatePnpm } from "../../utils/pnpm-validator/index.js";
import {
    confirmDirectoryOverwrite,
    promptForDatabase,
    promptForProjectName,
} from "../../utils/user-input/index.js";
import type { BlobConfiguration } from "../../utils/vercel-cli/blob-types.js";
import { createProjectConfig } from "./config.js";
import { collectDatabaseConfig } from "./database-provisioning/prompts.js";
import { DatabaseProvisioningService } from "./database-provisioning/service.js";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
} from "./database-provisioning/types.js";
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
 * データベース選択とプロビジョニング設定を処理
 */
async function handleDatabaseAndBlobSetup(
    args: { database?: string },
    template: string | undefined,
    projectName: string
): Promise<{
    database: DatabaseType | undefined;
    databaseConfig: DatabaseProvisioningConfig | undefined;
    databaseCredentials: DatabaseCredentials | undefined;
    blobConfig: BlobConfiguration | undefined;
}> {
    console.log("🚀 handleDatabaseAndBlobSetup が呼び出されました");
    console.log(`  template: "${template}"`);
    // データベース選択の決定
    const database = await determineDatabaseSelection(args, template);

    let databaseConfig: DatabaseProvisioningConfig | undefined;
    let databaseCredentials: DatabaseCredentials | undefined;

    // データベースが選択された場合、プロビジョニング設定を収集
    if (database) {
        try {
            databaseConfig = await collectDatabaseConfig(projectName, database);

            // プロビジョニングをスキップする場合以外は、実際にプロビジョニングを実行
            if (!databaseConfig.options.skipProvisioning) {
                const provisioningService = new DatabaseProvisioningService();
                const result =
                    await provisioningService.provision(databaseConfig);

                if (!result.success) {
                    console.error(
                        `❌ データベースプロビジョニングに失敗しました: ${result.error}`
                    );
                    process.exit(1);
                }

                databaseCredentials = result.credentials;

                console.log("✅ データベースプロビジョニングが完了しました");
                if (result.databases) {
                    for (const db of result.databases) {
                        console.log(
                            `  - ${db.environment}: ${db.name} (${db.status})`
                        );
                    }
                }
            }
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

    // Blob設定の収集（Next.jsフルスタックテンプレートの場合のみ）
    let blobConfig: BlobConfiguration | undefined;
    const shouldConfigureBlob = (
        projectType: string,
        templateName: string | undefined
    ) => projectType === "nextjs" && templateName === "fullstack-admin";

    // デバッグ情報を出力
    console.log("🔍 Blob設定デバッグ情報:");
    console.log(`  template: "${template}"`);
    console.log(
        `  shouldConfigureBlob: ${shouldConfigureBlob("nextjs", template)}`
    );

    if (template && shouldConfigureBlob("nextjs", template)) {
        try {
            const config = await collectBlobConfiguration(projectName);
            blobConfig = config || undefined;
            if (blobConfig) {
                console.log(`✅ Vercel Blob設定完了: ${blobConfig.storeName}`);
            }
        } catch (error) {
            console.warn(
                `⚠️ Vercel Blob設定をスキップします: ${error instanceof Error ? error.message : error}`
            );
        }
    }

    return { database, databaseConfig, databaseCredentials, blobConfig };
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
        if (isMonorepoMode) {
            const isPnpmValid = validatePnpm();
            if (!isPnpmValid) {
                process.exit(1);
            }
        }

        // プロジェクト名が指定されていない場合は入力を促進
        let projectName = args.name;
        if (!projectName) {
            projectName = await promptForProjectName();
        }

        // データベース選択とプロビジョニング設定の処理
        const { database, databaseConfig, databaseCredentials, blobConfig } =
            await handleDatabaseAndBlobSetup(args, args.template, projectName);

        // プロジェクト設定を作成
        const config = createProjectConfig(resolvedProjectType, {
            name: projectName,
            template: args.template,
            dir: args.dir,
            force: args.force,
            monorepo: isMonorepoMode,
            database,
        });

        // 設定が無効な場合はエラー終了
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

        // 既存ディレクトリの確認（--forceフラグがない場合）
        if (!config.force) {
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
        } catch (_error) {
            // 生成エラーの場合はエラー終了
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

        // プロジェクト名の取得
        let projectName = args.name;
        if (!projectName) {
            projectName = await promptForProjectName();
        }

        // プロジェクトタイプとテンプレートの決定
        const hasExplicitMonorepo = hasExplicitMonorepoFlag(rawArgs);
        const { projectType, template, monorepoPreference } =
            await determineProjectTypeAndTemplate(args, hasExplicitMonorepo);

        // データベース選択とプロビジョニング設定の処理
        const { database, databaseConfig, databaseCredentials, blobConfig } =
            await handleDatabaseAndBlobSetup(args, template, projectName);

        // モノレポ設定の最終決定（明示指定 > 選択結果 > 既定 true）
        const isMonorepoMode = args.simple
            ? false
            : (monorepoPreference ?? args.monorepo ?? true);

        // pnpmバリデーション
        if (isMonorepoMode) {
            const isPnpmValid = validatePnpm();
            if (!isPnpmValid) {
                process.exit(1);
            }
        }

        // プロジェクト設定の作成と検証
        const config = await createAndValidateConfig({
            projectType,
            projectName,
            template,
            args,
            isMonorepoMode,
            database,
            databaseConfig,
            databaseCredentials,
            blobConfig,
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
        } catch (_error) {
            process.exit(1);
        }

        process.exit(0);
    },
});

// EOF
