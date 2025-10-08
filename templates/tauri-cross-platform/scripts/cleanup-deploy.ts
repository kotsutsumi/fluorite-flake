#!/usr/bin/env tsx

/**
 * デプロイ環境クリーンアップスクリプト
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

type CleanupResult = {
    success: boolean;
    error?: string;
};

type ExecuteCleanup = (projectPath?: string) => Promise<CleanupResult>;

async function loadExecuteCleanup(): Promise<ExecuteCleanup> {
    try {
        const module = await import("fluorite-flake/dist/utils/resource-manager/index.js");
        if (typeof module.executeCleanup === "function") {
            return module.executeCleanup as ExecuteCleanup;
        }
    } catch {
        // 依存が存在しない場合はフォールバックを試す
    }

    try {
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const localModulePath = path.resolve(currentDir, "../../../src/utils/resource-manager/index.js");
        const module = await import(localModulePath);
        if (typeof module.executeCleanup === "function") {
            return module.executeCleanup as ExecuteCleanup;
        }
    } catch {
        // 依存が存在しない場合はフォールバックを試す
    }

    throw new Error(
        "executeCleanup の読み込みに失敗しました。プロジェクトに fluorite-flake を devDependencies として追加してください。"
    );
}

async function main(): Promise<void> {
    console.log("🗑️  Fluorite プロジェクト削除ツール\n");

    try {
        const executeCleanup = await loadExecuteCleanup();
        const result = await executeCleanup(process.cwd());

        if (result.success) {
            console.log("\n🎉 削除処理が正常に完了しました！");
            process.exit(0);
        }

        console.error("\n❌ 削除処理中にエラーが発生しました");
        if (result.error) {
            console.error(`エラー詳細: ${result.error}`);
        }
        process.exit(1);
    } catch (error) {
        console.error("\n💥 クリーンアップ実行中にエラーが発生しました:");
        console.error(error instanceof Error ? error.message : error);
        console.error("fluorite-flake がインストールされているか確認し、再度実行してください。");
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => console.error(error));
}

// EOF
