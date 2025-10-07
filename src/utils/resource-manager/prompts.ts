/**
 * クリーンアップ用プロンプト機能
 */

import { confirm, isCancel, multiselect, select, text } from "@clack/prompts";
import chalk from "chalk";

import type {
    BackupPlan,
    CleanupPlan,
    DeletionStep,
    ProjectInventory,
    ResourceSelection,
    ResourceType,
} from "./types.js";

/**
 * クリーンアッププロンプトを制御するクラス
 */
export class CleanupPrompts {
    /** メインクリーンアップフロー */
    async executeCleanupFlow(
        inventory: ProjectInventory
    ): Promise<CleanupPlan | null> {
        console.log(chalk.blue("\n🗑️  デプロイ環境クリーンアップ"));
        console.log(chalk.gray("検出されたリソースを安全に削除します\n"));

        const selection = await this.presentResourceSelection(inventory);
        if (!selection) {
            return null;
        }

        await this.displayRiskAssessment(inventory, selection);

        const backupConfirmed = await this.confirmBackupStatus(selection);
        if (!backupConfirmed) {
            console.log(chalk.yellow("操作をキャンセルしました。"));
            return null;
        }

        const plan = this.createDeletionPlan(inventory, selection);
        const userConfirmed = await this.confirmDeletionPlan(plan);
        if (!userConfirmed) {
            return null;
        }

        const finalConfirmed = await this.finalConfirmation(
            inventory.projectName
        );
        if (!finalConfirmed) {
            return null;
        }

        return plan;
    }

    /** リソース選択プロンプト */
    private async presentResourceSelection(
        inventory: ProjectInventory
    ): Promise<ResourceSelection | null> {
        console.log(chalk.white("📋 検出されたリソース:"));
        this.displayDiscoveredResources(inventory);

        const availableTypes = this.getAvailableResourceTypes(inventory);
        if (availableTypes.length === 0) {
            console.log(
                chalk.yellow("削除対象となるリソースが見つかりませんでした")
            );
            return null;
        }

        const selectedTypesResult = await multiselect<ResourceType>({
            message: "削除するリソースを選択してください",
            required: true,
            options: availableTypes.map((type) => ({
                value: type,
                label: this.getResourceTypeLabel(type),
                hint: this.getResourceTypeHint(type, inventory),
            })),
        });

        if (isCancel(selectedTypesResult)) {
            return null;
        }

        const selectedTypes = (selectedTypesResult as ResourceType[]) ?? [];
        if (selectedTypes.length === 0) {
            return null;
        }

        let scope: ResourceSelection["scope"] = "all";
        const requiresScope = this.hasMultipleEnvironments(
            inventory,
            selectedTypes
        );
        if (requiresScope) {
            const scopeResult = await select<ResourceSelection["scope"]>({
                message: "削除範囲を選択してください",
                options: [
                    { value: "development", label: "開発環境のみ" },
                    { value: "staging", label: "ステージング環境のみ" },
                    { value: "production", label: "本番環境のみ" },
                    { value: "all", label: "全ての環境" },
                ],
            });

            if (isCancel(scopeResult)) {
                return null;
            }

            scope = scopeResult ?? "all";
        }

        return {
            selectedTypes,
            scope,
            environments: this.getEnvironmentsFromScope(scope),
            excludedResources: [],
        };
    }

    /** 検出済みリソースの一覧表示 */
    private displayDiscoveredResources(inventory: ProjectInventory): void {
        if (inventory.vercel) {
            console.log(
                `  ${chalk.blue("🌐")} Vercel プロジェクト: ${inventory.vercel.projectId ?? "不明"}`
            );
        }

        if (inventory.databases?.resources.length) {
            console.log(
                `  ${chalk.green("🗄️")} データベース (${inventory.databases.type}): ${inventory.databases.resources.length}件`
            );
            for (const resource of inventory.databases.resources) {
                console.log(
                    `    - ${resource.environment}: ${resource.identifier}`
                );
            }
        }

        if (inventory.storage?.blobStores.length) {
            console.log(
                `  ${chalk.magenta("📦")} Blob ストア: ${inventory.storage.blobStores.length}件`
            );
            for (const store of inventory.storage.blobStores) {
                console.log(`    - ${store.name} (${store.id})`);
            }
        }

        console.log("");
    }

    /** 利用可能なリソースタイプの抽出 */
    private getAvailableResourceTypes(
        inventory: ProjectInventory
    ): ResourceType[] {
        const types: ResourceType[] = [];

        if (inventory.vercel) {
            types.push("vercel-project");
        }
        if (
            inventory.databases?.type === "turso" &&
            inventory.databases.resources.length > 0
        ) {
            types.push("turso-database");
        }
        if (
            inventory.databases?.type === "supabase" &&
            inventory.databases.resources.length > 0
        ) {
            types.push("supabase-project");
        }
        if (inventory.storage?.blobStores.length) {
            types.push("blob-store");
        }

        return types;
    }

    /** リソースタイプの表示名 */
    private getResourceTypeLabel(type: ResourceType): string {
        const labels: Record<ResourceType, string> = {
            "vercel-project": "🌐 Vercel プロジェクト",
            "turso-database": "🗄️ Turso データベース",
            "supabase-project": "🗄️ Supabase プロジェクト",
            "blob-store": "📦 Vercel Blob ストア",
            "environment-variables": "🔧 環境変数",
            domains: "🌍 カスタムドメイン",
        };
        return labels[type] ?? type;
    }

    /** リソースタイプに応じたヒント */
    private getResourceTypeHint(
        type: ResourceType,
        inventory: ProjectInventory
    ): string {
        switch (type) {
            case "vercel-project":
                return inventory.vercel?.projectId ?? "プロジェクト設定";
            case "turso-database":
                return `${inventory.databases?.resources.length ?? 0}個のデータベース`;
            case "supabase-project":
                return `${inventory.databases?.resources.length ?? 0}個のプロジェクト`;
            case "blob-store":
                return `${inventory.storage?.blobStores.length ?? 0}個のストア`;
            default:
                return "";
        }
    }

    /** 環境が複数存在するか判定 */
    private hasMultipleEnvironments(
        inventory: ProjectInventory,
        selectedTypes: ResourceType[]
    ): boolean {
        if (
            selectedTypes.includes("turso-database") ||
            selectedTypes.includes("supabase-project")
        ) {
            return (inventory.databases?.resources.length ?? 0) > 1;
        }
        return false;
    }

    /** 選択スコープから対象環境を算出 */
    private getEnvironmentsFromScope(
        scope: ResourceSelection["scope"]
    ): string[] {
        switch (scope) {
            case "development":
                return ["development"];
            case "staging":
                return ["staging"];
            case "production":
                return ["production"];
            default:
                return ["development", "staging", "production"];
        }
    }

    /** リスク情報の表示 */
    private async displayRiskAssessment(
        inventory: ProjectInventory,
        selection: ResourceSelection
    ): Promise<void> {
        const assessment = inventory.dependencies.riskAssessment;
        console.log(chalk.yellow("\n⚠️  リスク評価"));
        console.log(
            `リスクレベル: ${this.getRiskColor(assessment.overall)(assessment.overall)}`
        );

        for (const factor of assessment.factors) {
            const isRelevant = factor.affectedResources.some((resource) =>
                selection.selectedTypes.includes(resource as ResourceType)
            );
            if (!isRelevant) {
                continue;
            }

            const severityColor = this.getSeverityColor(factor.severity);
            console.log(
                `  • ${severityColor(factor.severity)}: ${factor.description}`
            );
        }

        if (assessment.mitigations.length > 0) {
            console.log(chalk.gray("\n推奨される対策:"));
            for (const mitigation of assessment.mitigations) {
                console.log(`  • ${mitigation}`);
            }
        }
    }

    /** バックアップ確認 */
    private async confirmBackupStatus(
        selection: ResourceSelection
    ): Promise<boolean> {
        console.log(chalk.blue("\n💾 バックアップ確認"));
        if (
            selection.selectedTypes.includes("turso-database") ||
            selection.selectedTypes.includes("supabase-project")
        ) {
            console.log(
                chalk.yellow("⚠️ データベースを削除すると復旧できません。")
            );
        }
        console.log(
            chalk.white("必要なバックアップが完了しているか確認してください。")
        );

        const confirmed = await confirm({
            message: "バックアップは完了していますか？",
            initialValue: false,
        });

        if (isCancel(confirmed)) {
            return false;
        }

        return Boolean(confirmed);
    }

    /** 削除計画を生成 */
    private createDeletionPlan(
        inventory: ProjectInventory,
        selection: ResourceSelection
    ): CleanupPlan {
        const steps: DeletionStep[] = [];

        for (const priority of inventory.dependencies.deletionOrder) {
            this.appendStepsForResourceType(
                steps,
                priority.type,
                inventory,
                selection
            );
        }

        const backupPlan = this.createBackupPlan(inventory, selection);
        const estimatedDuration = this.estimateDuration(steps);

        return {
            projectName: inventory.projectName,
            steps,
            targetResources: selection,
            backupPlan,
            estimatedDuration,
            riskLevel: inventory.dependencies.riskAssessment.overall,
        };
    }

    /** リソースタイプごとの削除ステップを追加 */
    private appendStepsForResourceType(
        steps: DeletionStep[],
        type: ResourceType,
        inventory: ProjectInventory,
        selection: ResourceSelection
    ): void {
        switch (type) {
            case "vercel-project": {
                const projectId = inventory.vercel?.projectId;
                if (projectId) {
                    steps.push({
                        id: `vercel-${projectId}`,
                        type,
                        description: "Vercel プロジェクトを削除",
                        parameters: { projectId },
                        order: steps.length + 1,
                        requiresBackup: true,
                        dependencies: [],
                    });
                }
                break;
            }
            case "turso-database": {
                if (inventory.databases?.type !== "turso") {
                    break;
                }
                for (const resource of inventory.databases.resources) {
                    if (
                        !selection.environments.includes(resource.environment)
                    ) {
                        continue;
                    }
                    steps.push({
                        id: `turso-${resource.identifier}`,
                        type,
                        description: `Turso データベース (${resource.environment})`,
                        parameters: { databaseName: resource.identifier },
                        environment: resource.environment,
                        order: steps.length + 1,
                        requiresBackup: true,
                        dependencies: [],
                    });
                }
                break;
            }
            case "supabase-project": {
                if (inventory.databases?.type !== "supabase") {
                    break;
                }
                for (const resource of inventory.databases.resources) {
                    if (
                        !selection.environments.includes(resource.environment)
                    ) {
                        continue;
                    }
                    steps.push({
                        id: `supabase-${resource.identifier}`,
                        type,
                        description: `Supabase プロジェクト (${resource.environment})`,
                        parameters: { projectRef: resource.identifier },
                        environment: resource.environment,
                        order: steps.length + 1,
                        requiresBackup: true,
                        dependencies: [],
                    });
                }
                break;
            }
            case "blob-store": {
                for (const store of inventory.storage?.blobStores ?? []) {
                    steps.push({
                        id: `blob-${store.id}`,
                        type,
                        description: `Vercel Blob ストア (${store.name})`,
                        parameters: { storeId: store.id, token: store.token },
                        order: steps.length + 1,
                        requiresBackup: false,
                        dependencies: [],
                    });
                }
                break;
            }
            default: {
                console.warn(
                    `未対応のリソースタイプをスキップしました: ${type}`
                );
                break;
            }
        }
    }

    /** バックアップ計画を生成 */
    private createBackupPlan(
        _inventory: ProjectInventory,
        _selection: ResourceSelection
    ): BackupPlan {
        return {
            entries: [],
            estimatedSize: 0,
            destination: `./cleanup-backup-${Date.now()}`,
        };
    }

    /** おおよその実行時間を推定 */
    private estimateDuration(steps: DeletionStep[]): number {
        const baseSeconds = 30;
        return steps.length * baseSeconds;
    }

    /** 削除計画の最終確認 */
    private async confirmDeletionPlan(plan: CleanupPlan): Promise<boolean> {
        console.log(chalk.blue("\n📋 削除計画"));
        console.log(`ステップ数: ${plan.steps.length}`);
        console.log(
            `推定時間: ${Math.max(1, Math.ceil(plan.estimatedDuration / 60))} 分程度`
        );
        console.log(
            `リスクレベル: ${this.getRiskColor(plan.riskLevel)(plan.riskLevel)}`
        );

        console.log(chalk.white("\n削除対象:"));
        for (const step of plan.steps) {
            console.log(`  ${step.order}. ${step.description}`);
        }

        const confirmed = await confirm({
            message: "この計画で削除を実行しますか？",
            initialValue: false,
        });

        if (isCancel(confirmed)) {
            return false;
        }

        return Boolean(confirmed);
    }

    /** プロジェクト名による最終確認 */
    private async finalConfirmation(projectName: string): Promise<boolean> {
        console.log(chalk.red("\n⚠️  最終確認"));
        console.log(chalk.yellow("この操作は取り消せません。"));

        const result = await text({
            message: `プロジェクト名 "${projectName}" を入力してください`,
            validate: (value) => {
                if (!value || value.trim() !== projectName) {
                    return `"${projectName}" と正確に入力してください`;
                }
                return;
            },
        });

        if (isCancel(result)) {
            return false;
        }

        if ((result ?? "").trim() !== projectName) {
            return false;
        }

        console.log(chalk.green("確認が完了しました。削除を開始します。\n"));
        return true;
    }

    /** リスクレベルに応じた色付け */
    private getRiskColor(level: string): (input: string) => string {
        switch (level) {
            case "low":
                return chalk.green;
            case "medium":
                return chalk.yellow;
            case "high":
                return chalk.red;
            case "critical":
                return chalk.redBright;
            default:
                return chalk.white;
        }
    }

    /** 重大度に応じた色付け */
    private getSeverityColor(severity: string): (input: string) => string {
        return this.getRiskColor(severity);
    }
}

// EOF
