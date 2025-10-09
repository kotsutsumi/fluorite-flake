/**
 * 削除オーケストレーション
 */

import chalk from "chalk";

import { executeSupabaseCommand } from "../supabase-cli/index.js";
import { executeTursoCommand } from "../turso-cli/index.js";
import { VercelCLI } from "../vercel-cli/index.js";
import type { CleanupPlan, CleanupResult, DeletionStep, DeletionStepResult } from "./types.js";

/**
 * 削除処理を調整するクラス
 */
export class CleanupOrchestrator {
    /** 削除計画を実行 */
    async executeDeletionPlan(plan: CleanupPlan): Promise<CleanupResult> {
        const startedAt = Date.now();
        const results: DeletionStepResult[] = [];

        if (plan.steps.length === 0) {
            console.log(chalk.yellow("削除対象のステップが存在しませんでした"));
            return {
                success: true,
                completedSteps: 0,
                failedSteps: 0,
                stepResults: [],
                rollbackPerformed: false,
                totalDuration: 0,
            };
        }

        console.log(chalk.blue(`\n🚀 ${plan.steps.length} 件の削除を開始します`));

        let rollbackPerformed = false;
        for (const step of plan.steps) {
            console.log(`\n${this.getStepIcon(step.type)} ${step.description}を削除中...`);
            const result = await this.executeStep(step);
            results.push(result);

            if (result.success) {
                console.log(chalk.green(`✅ ${step.description}の削除が完了しました`));
                this.displayProgress(results.length, plan.steps.length);
                continue;
            }

            console.error(chalk.red(`❌ ${step.description}の削除に失敗しました: ${result.error ?? "不明なエラー"}`));
            rollbackPerformed = await this.executeRollback(results);
            break;
        }

        const totalDuration = Date.now() - startedAt;
        return this.aggregateResults(results, rollbackPerformed, totalDuration);
    }

    /** 個別ステップを実行 */
    private async executeStep(step: DeletionStep): Promise<DeletionStepResult> {
        const startedAt = Date.now();

        try {
            switch (step.type) {
                case "vercel-project":
                    return await this.deleteVercelProject(step, startedAt);
                case "turso-database":
                    return await this.deleteTursoDatabase(step, startedAt);
                case "supabase-project":
                    return await this.deleteSupabaseProject(step, startedAt);
                case "blob-store":
                    return await this.deleteBlobStore(step, startedAt);
                default:
                    throw new Error(`未対応のステップタイプ: ${step.type}`);
            }
        } catch (error) {
            return {
                step,
                success: false,
                duration: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /** Vercel プロジェクト削除 */
    private async deleteVercelProject(step: DeletionStep, startedAt: number): Promise<DeletionStepResult> {
        const projectId = step.parameters.projectId as string | undefined;
        if (!projectId) {
            throw new Error("Vercel プロジェクト ID が取得できませんでした");
        }

        const result = VercelCLI.projectRemove(projectId, { yes: true });
        if (!result.success) {
            throw new Error(result.stderr || "Vercel CLI がエラーを返しました");
        }

        return {
            step,
            success: true,
            duration: Date.now() - startedAt,
            rollbackData: { projectId },
        };
    }

    /** Turso データベース削除 */
    private async deleteTursoDatabase(step: DeletionStep, startedAt: number): Promise<DeletionStepResult> {
        const databaseName = step.parameters.databaseName as string | undefined;
        if (!databaseName) {
            throw new Error("Turso データベース名が取得できませんでした");
        }

        const result = await executeTursoCommand(["db", "destroy", databaseName, "--yes"]);

        if (!result.success) {
            throw new Error(result.stderr || result.error || "Turso CLI がエラーを返しました");
        }

        return {
            step,
            success: true,
            duration: Date.now() - startedAt,
            rollbackData: { databaseName },
        };
    }

    /** Supabase プロジェクト削除 */
    private async deleteSupabaseProject(step: DeletionStep, startedAt: number): Promise<DeletionStepResult> {
        const projectRef = step.parameters.projectRef as string | undefined;
        if (!projectRef) {
            throw new Error("Supabase プロジェクト参照 ID が取得できませんでした");
        }

        const result = await executeSupabaseCommand(["projects", "delete", projectRef, "--yes", "--non-interactive"]);

        if (result.exitCode !== 0 || result.error) {
            throw new Error(result.stderr || result.error?.message || "Supabase CLI がエラーを返しました");
        }

        return {
            step,
            success: true,
            duration: Date.now() - startedAt,
            rollbackData: { projectRef },
        };
    }

    /** Vercel Blob ストア削除 */
    private async deleteBlobStore(step: DeletionStep, startedAt: number): Promise<DeletionStepResult> {
        const storeId = step.parameters.storeId as string | undefined;
        if (!storeId) {
            throw new Error("Blob ストア ID が取得できませんでした");
        }

        const token = step.parameters.token as string | undefined;
        const result = VercelCLI.execute(`blob rm ${storeId} --yes`, {
            token,
        });

        if (!result.success) {
            throw new Error(result.stderr || "Blob ストア削除に失敗しました");
        }

        return {
            step,
            success: true,
            duration: Date.now() - startedAt,
            rollbackData: { storeId },
        };
    }

    /** 失敗時のロールバックメッセージ表示 */
    private async executeRollback(results: DeletionStepResult[]): Promise<boolean> {
        const successful = results.filter((result) => result.success);
        if (successful.length === 0) {
            return false;
        }

        console.log(chalk.yellow("\n🔄 ロールバック手順の確認が必要です"));
        for (const result of successful.reverse()) {
            console.log(
                chalk.yellow(`  • ${result.step.description} を再作成する必要があります (ID: ${result.step.id})`)
            );
        }
        console.log(chalk.gray("自動ロールバックは実装されていません。各サービスで手動復旧を行ってください。"));
        return false;
    }

    /** 進捗表示 */
    private displayProgress(completed: number, total: number): void {
        const percentage = Math.floor((completed / total) * 100);
        const bar = this.createProgressBar(percentage);
        console.log(chalk.gray(`進捗: ${bar} ${completed}/${total} (${percentage}%)`));
    }

    /** プログレスバーを生成 */
    private createProgressBar(percentage: number): string {
        const width = 20;
        const filled = Math.round((percentage / 100) * width);
        return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    }

    /** 実行結果を集計 */
    private aggregateResults(
        results: DeletionStepResult[],
        rollbackPerformed: boolean,
        totalDuration: number
    ): CleanupResult {
        const completedSteps = results.filter((result) => result.success).length;
        const failedSteps = results.filter((result) => !result.success).length;
        const success = failedSteps === 0;

        console.log(chalk.blue("\n📊 削除サマリー"));
        console.log(`実行時間: ${Math.round(totalDuration / 1000)} 秒`);
        console.log(`成功: ${chalk.green(completedSteps)} 件`);
        console.log(`失敗: ${failedSteps > 0 ? chalk.red(failedSteps) : chalk.gray(failedSteps)} 件`);

        if (success) {
            console.log(chalk.green("\n✅ 全てのリソースが削除されました"));
        } else {
            console.log(chalk.red("\n❌ 一部の削除に失敗しました"));
        }

        if (rollbackPerformed) {
            console.log(chalk.yellow("手動ロールバックをご確認ください"));
        }

        return {
            success,
            completedSteps,
            failedSteps,
            stepResults: results,
            rollbackPerformed,
            totalDuration,
            error: success ? undefined : results.find((result) => !result.success)?.error,
        };
    }

    /** ステップ種別に応じた表示アイコン */
    private getStepIcon(type: string): string {
        const icons: Record<string, string> = {
            "vercel-project": "🌐",
            "turso-database": "🗄️",
            "supabase-project": "🗄️",
            "blob-store": "📦",
            "environment-variables": "🔧",
            domains: "🌍",
        };
        return icons[type] ?? "🔧";
    }
}

// EOF
