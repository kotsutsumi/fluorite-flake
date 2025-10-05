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

// 初期メッセージを取得
const initialMessages = getMessages();

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
            default: "nextjs",
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
        const isMonorepoMode = args.simple ? false : args.monorepo;
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
        const config = createProjectConfig(args.type, {
            name: projectName,
            template: args.template,
            dir: args.dir,
            force: args.force,
            monorepo: args.simple ? false : args.monorepo, // --simpleフラグがあればmonorepo=false
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
        } catch (_error) {
            // 生成エラーの場合はエラー終了
            process.exit(1);
        }
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
    run: createCommand.run,
});

// EOF
