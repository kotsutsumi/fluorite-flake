/**
 * createコマンドとnewコマンドの定義
 */
import { defineCommand } from "citty";

import { debugLog } from "../../debug.js";
import { getMessages } from "../../i18n.js";
import { validatePnpm } from "../../utils/pnpm-validator/index.js";
import {
    confirmDirectoryOverwrite,
    promptForProjectName,
} from "../../utils/user-input/index.js";
import { createProjectConfig } from "./config.js";
import { generateProject } from "./generator.js";
import { selectProjectTemplate } from "./template-selector/index.js";
import type { ProjectType } from "./types.js";
import { validateProjectType } from "./validators.js";

const ADVANCED_TEMPLATES: Partial<Record<ProjectType, readonly string[]>> = {
    nextjs: ["fullstack-admin"],
    expo: ["fullstack-graphql"],
    tauri: ["desktop-admin", "cross-platform"],
};

// 初期メッセージを取得
const initialMessages = getMessages();

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
 * プロジェクトタイプとテンプレートを決定
 */
async function determineProjectTypeAndTemplate(
    args: any,
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
    args: any;
    isMonorepoMode: boolean;
};

/**
 * プロジェクト設定を作成し検証
 */
async function createAndValidateConfig(
    options: CreateAndValidateConfigOptions
) {
    const { projectType, projectName, template, args, isMonorepoMode } =
        options;
    const config = createProjectConfig(projectType, {
        name: projectName,
        template,
        dir: args.dir,
        force: args.force,
        monorepo: isMonorepoMode,
    });

    if (!config) {
        process.exit(1);
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

        // プロジェクト設定を作成
        const config = createProjectConfig(resolvedProjectType, {
            name: projectName,
            template: args.template,
            dir: args.dir,
            force: args.force,
            monorepo: isMonorepoMode,
        });

        // 設定が無効な場合はエラー終了
        if (!config) {
            process.exit(1);
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
        });

        // プロジェクトの生成
        try {
            await generateProject(config);
            debugLog("New command completed successfully");
        } catch (_error) {
            process.exit(1);
        }

        process.exit(0);
    },
});

// EOF
