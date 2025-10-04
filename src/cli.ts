#!/usr/bin/env node
/**
 * Fluorite-flake CLI エントリーポイント
 */
import { defineCommand, runMain } from "citty";

import { createCommand, newCommand } from "./commands/create/index.js";
import {
    debugLog,
    isDevelopment,
    printDevelopmentInfo,
    setupDevelopmentWorkspace,
} from "./debug.js";
import { printHeader } from "./header.js";
import { getMessages } from "./i18n.js";

// 開発環境での初期化
if (isDevelopment()) {
    // 詳細な環境情報を表示
    printDevelopmentInfo();

    // 開発用の一時ディレクトリをセットアップ
    setupDevelopmentWorkspace();

    //
}

const main = defineCommand({
    meta: {
        name: "fluorite-flake",
        version: "0.5.0",
        description: getMessages().cli.metaDescription,
    },
    subCommands: {
        create: createCommand,
        new: newCommand,
    },
    run() {
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

runMain(main);

// EOF
