/**
 * TUIダッシュボードコマンド定義
 */

import { defineCommand } from "citty";
import { render } from "ink";
import React from "react";

import { DashboardApp } from "./components/layout/main-layout.js";
// サービスタイプの型定義
import type { ServiceType } from "./types/common.js";

export type { ServiceType } from "./types/common.js";

/**
 * ダッシュボードを起動する
 * @param initialService 初期表示するサービス
 */
export async function launchDashboard(initialService?: ServiceType): Promise<void> {
    try {
        // Raw Modeのサポートチェック
        if (!process.stdin.isTTY) {
            console.log("⚠️  このコマンドはインタラクティブな端末でのみ動作します。");
            console.log("   通常のターミナルやコマンドプロンプトから実行してください。");
            process.exit(1);
            return;
        }

        // stdoutのisTTYもチェック
        if (!process.stdout.isTTY) {
            console.log("⚠️  このコマンドはインタラクティブな端末でのみ動作します。");
            console.log("   パイプやリダイレクトを使わずに直接実行してください。");
            process.exit(1);
            return;
        }

        // ダッシュボードアプリケーションをレンダリング
        const { waitUntilExit } = render(React.createElement(DashboardApp, { initialService }), {
            // エラーを防ぐため、patchConsoleを無効化
            patchConsole: false,
        });

        // アプリケーションの終了を待機
        await waitUntilExit();
    } catch (error) {
        // Raw Modeエラーの特別な処理
        if (error instanceof Error && error.message.includes("Raw mode is not supported")) {
            console.log("⚠️  このコマンドは現在の環境では実行できません。");
            console.log("   インタラクティブな端末から実行してください。");
            console.log("");
            console.log("💡 代わりに以下のコマンドをお試しください:");
            console.log("   fluorite-flake create    # プロジェクト作成");
            console.log("   fluorite-flake --help    # ヘルプ表示");
            process.exit(1);
            return;
        }

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
            description: "Start with specific service (vercel|turso|supabase|github)",
        },
    },
    async run({ args }) {
        const service = args.service as ServiceType | undefined;
        await launchDashboard(service);
    },
});

// EOF
