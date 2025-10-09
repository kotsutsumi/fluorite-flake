#!/usr/bin/env node
/**
 * Fluorite-Flake CLI エントリーポイント
 */
import { type CommandContext, defineCommand, runMain } from "citty";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCommand, newCommand } from "./commands/create/index.js";
import { dashboardCommand } from "./commands/dashboard/index.js";
import { debugLog, isDevelopment, printDevelopmentInfo, setupDevelopmentWorkspace } from "./debug.js";
import { printHeader } from "./header.js";
import { getMessages } from "./i18n.js";

// package.jsonからバージョンを読み取る
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

// 開発環境での初期化
if (isDevelopment()) {
    // 詳細な環境情報を表示
    printDevelopmentInfo();

    // 開発用の一時ディレクトリをセットアップ
    setupDevelopmentWorkspace();
}

const main = defineCommand({
    meta: {
        name: "fluorite-flake",
        version: version,
        description: getMessages().cli.metaDescription,
    },
    subCommands: {
        create: createCommand,
        new: newCommand,
        dashboard: dashboardCommand,
    },
    run(context: CommandContext) {
        // 開発モードでのコンテキストデバッグ
        if (isDevelopment()) {
            debugLog("Context debug:", {
                subCommand: context.subCommand,
                args: context.args,
                argsLength: context.args._.length,
                rawArgs: process.argv,
            });
        }

        // サブコマンドが存在する場合は何もしない
        if (context.subCommand) {
            return;
        }

        // コマンドライン引数にサブコマンドが含まれている場合も何もしない
        const hasSubCommand =
            process.argv.includes("create") || process.argv.includes("new") || process.argv.includes("dashboard");
        if (hasSubCommand) {
            if (isDevelopment()) {
                debugLog("Detected subcommand in process.argv, skipping main command");
            }
            return;
        }

        // 引数が渡されている場合は何もしない
        if (context.args._.length > 0) {
            return;
        }

        const { cli } = getMessages();

        // 開発モードでの詳細なデバッグ情報
        debugLog(cli.devNoSubcommand);

        // ヘッダー表示
        printHeader();

        // 利用方法とコマンド一覧を表示
        console.log(cli.usage);
        console.log("");
        console.log(cli.commandsHeading);
        for (const line of cli.commandLines) {
            console.log(line);
        }
        console.log("");
        console.log(cli.projectTypes);
        console.log("");
        console.log(cli.examplesHeading);
        for (const line of cli.exampleLines) {
            console.log(line);
        }
    },
});

if (isDevelopment()) {
    debugLog("About to run main command");
}

runMain(main)
    .then((result) => {
        if (isDevelopment()) {
            debugLog("Main command execution completed", result);
        }
    })
    .catch((error) => {
        if (isDevelopment()) {
            debugLog("Main command execution failed", error);
        }
    });

// EOF
