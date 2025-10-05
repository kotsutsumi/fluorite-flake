/**
 * TUIダッシュボードコマンド定義
 */
import React from "react";
import { defineCommand } from "citty";
import { render } from "ink";

import { DashboardApp } from "./components/layout/main-layout.js";
// サービスタイプの型定義
import type { ServiceType } from "./types/common.js";

export type { ServiceType } from "./types/common.js";

/**
 * ダッシュボードを起動する
 * @param initialService 初期表示するサービス
 */
export async function launchDashboard(
    initialService?: ServiceType
): Promise<void> {
    try {
        // ダッシュボードアプリケーションをレンダリング
        const { waitUntilExit } = render(
            React.createElement(DashboardApp, { initialService })
        );

        // アプリケーションの終了を待機
        await waitUntilExit();
    } catch (error) {
        console.error("エラーが発生しました:", error);
        process.exit(1);
    }
}

/**
 * ダッシュボードコマンド定義
 */
export const dashboardCommand = defineCommand({
    meta: {
        name: "dashboard",
        description: "Launch interactive TUI dashboard for service management",
    },
    args: {
        service: {
            type: "string",
            description:
                "Start with specific service (vercel|turso|supabase|github)",
        },
    },
    async run({ args }) {
        const service = args.service as ServiceType | undefined;
        await launchDashboard(service);
    },
});

// EOF
