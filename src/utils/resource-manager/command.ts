/**
 * クリーンアップコマンド実装
 */

import { ResourceDiscovery } from "./discovery.js";
import { CleanupOrchestrator } from "./orchestrator.js";
import { CleanupPrompts } from "./prompts.js";
import type { CleanupResult } from "./types.js";

/**
 * デプロイ環境クリーンアップメイン関数
 */
export async function executeCleanup(projectPath: string = process.cwd()): Promise<CleanupResult> {
    const discovery = new ResourceDiscovery();
    const prompts = new CleanupPrompts();
    const orchestrator = new CleanupOrchestrator();

    try {
        // 1. プロジェクトリソース検出
        console.log("🔍 プロジェクトリソースを検出中...");
        const inventory = await discovery.discoverProjectResources(projectPath);

        // リソースが見つからない場合
        if (!(inventory.vercel || inventory.databases || inventory.storage)) {
            console.log("❌ 削除対象のリソースが見つかりませんでした。");
            console.log("このプロジェクトにはVercel、データベース、またはBlobストアの設定がありません。");
            return {
                success: false,
                completedSteps: 0,
                failedSteps: 0,
                stepResults: [],
                rollbackPerformed: false,
                totalDuration: 0,
                error: "削除対象リソースなし",
            };
        }

        // 2. プロンプトフローの実行
        const plan = await prompts.executeCleanupFlow(inventory);
        if (!plan) {
            console.log("⚠️ 削除操作がキャンセルされました。");
            return {
                success: false,
                completedSteps: 0,
                failedSteps: 0,
                stepResults: [],
                rollbackPerformed: false,
                totalDuration: 0,
                error: "ユーザーキャンセル",
            };
        }

        // 3. 削除実行
        const result = await orchestrator.executeDeletionPlan(plan);
        return result;
    } catch (error) {
        console.error("💥 クリーンアップ処理中にエラーが発生しました:");
        console.error(error instanceof Error ? error.message : error);

        return {
            success: false,
            completedSteps: 0,
            failedSteps: 0,
            stepResults: [],
            rollbackPerformed: false,
            totalDuration: 0,
            error: error instanceof Error ? error.message : "不明なエラー",
        };
    }
}

// EOF
