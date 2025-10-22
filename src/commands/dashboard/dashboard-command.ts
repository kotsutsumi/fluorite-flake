import React from "react";
import { defineCommand } from "citty";
import { render } from "ink";

import { getMessages } from "../../i18n.js";
import { DashboardApp } from "./app.js";
import { DashboardProvider } from "./state/dashboard-store.js";
import { parseService, type ServiceType } from "./types/common.js";

export type { ServiceType } from "./types/common.js";

/**
 * ダッシュボード UI を起動するエントリーポイント。
 */
export async function launchDashboard(initialService?: ServiceType): Promise<void> {
    const { dashboard } = getMessages();

    // TTY でない場合は Ink UI が表示できないため、メッセージを出して終了する。
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        for (const line of dashboard.nonInteractiveError) {
            console.log(line);
        }
        process.exitCode = 1;
        return;
    }

    // Provider でラップした Ink ツリーを生成してからレンダリングする。
    const tree = React.createElement(DashboardProvider, { initialService }, React.createElement(DashboardApp));

    const { waitUntilExit } = render(tree, {
        patchConsole: false,
    });

    await waitUntilExit();
}

// Citty で CLI コマンドを定義し、引数から初期表示サービスを受け取る。
export const dashboardCommand = defineCommand({
    meta: {
        name: "dashboard",
        description: getMessages().dashboard.commandDescription,
    },
    args: {
        service: {
            type: "string",
        description: "Initial service to display (vercel|turso)",
        },
    },
    async run({ args }) {
        const initialService = parseService(args.service);
        await launchDashboard(initialService);
    },
});

// ファイル終端
