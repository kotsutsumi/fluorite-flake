/**
 * リソース発見・管理システム
 */

import fs from "node:fs/promises";
import path from "node:path";

import type {
    BackupRequirement,
    BlobStoreResource,
    DatabaseResource,
    DatabaseResources,
    DeletionPriority,
    DependencyGraph,
    ProjectInventory,
    RiskAssessment,
    StorageResources,
    VercelResources,
} from "./types.js";

/** 対応している環境キー */
type EnvironmentKey = "development" | "staging" | "production";

/** 環境変数のマッピング情報 */
type EnvironmentMap = {
    combined: Record<string, string>;
    shared: Record<string, string>;
    byEnvironment: Record<EnvironmentKey, Record<string, string>>;
};

const ENV_FILES: Record<EnvironmentKey | "shared", string[]> = {
    shared: [".env"],
    development: [".env.local", ".env.development"],
    staging: [".env.staging"],
    production: [".env.prod", ".env.production"],
};

/**
 * プロジェクトに紐づくリソースを検出するクラス
 */
export class ResourceDiscovery {
    /** プロジェクト設定からリソースを自動検出 */
    async discoverProjectResources(projectPath: string): Promise<ProjectInventory> {
        const projectName = path.basename(projectPath);
        if (!projectName) {
            throw new Error("プロジェクト名が特定できませんでした");
        }

        const envMap = await this.readEnvironmentMap(projectPath);
        const vercel = await this.discoverVercelResources(projectPath, envMap);
        const databases = await this.discoverDatabaseResources(envMap);
        const storage = this.discoverStorageResources(envMap);
        const dependencies = await this.buildDependencyGraph(projectPath, envMap);

        return {
            projectName,
            projectPath,
            vercel,
            databases,
            storage,
            dependencies,
        };
    }

    /** Vercel関連リソースを検出 */
    private async discoverVercelResources(
        projectPath: string,
        envMap: EnvironmentMap
    ): Promise<VercelResources | undefined> {
        const envVars = envMap.combined;
        const vercelConfig = await this.readVercelConfig(projectPath);

        const projectId = vercelConfig?.projectId || envVars.VERCEL_PROJECT_ID || envVars.VERCEL_PROJECT_NAME;
        const orgId = vercelConfig?.orgId || envVars.VERCEL_ORG_ID;
        const hasIdentifier = Boolean(projectId || orgId);
        const hasEnvHints = this.hasVercelEnvVars(envVars);

        if (!(hasIdentifier || hasEnvHints)) {
            return;
        }

        return {
            projectId,
            orgId,
            domains: await this.discoverLinkedDomains(projectPath, vercelConfig),
            environmentVariables: this.extractVercelEnvVars(envVars),
        };
    }

    /** データベース種別に応じてリソースを検出 */
    private async discoverDatabaseResources(envMap: EnvironmentMap): Promise<DatabaseResources | undefined> {
        const dbType = this.detectDatabaseType(envMap.combined);
        if (dbType === "none") {
            return;
        }

        if (dbType === "turso") {
            return this.discoverTursoResources(envMap.byEnvironment, envMap.shared);
        }

        return this.discoverSupabaseResources(envMap.byEnvironment, envMap.shared);
    }

    /** Blob ストアなどのストレージリソースを検出 */
    private discoverStorageResources(envMap: EnvironmentMap): StorageResources | undefined {
        const blobStores = this.extractBlobStores(envMap.byEnvironment, envMap.shared);
        if (blobStores.length === 0) {
            return;
        }

        return { blobStores };
    }

    /** 依存関係グラフを構築 */
    private async buildDependencyGraph(projectPath: string, _envMap: EnvironmentMap): Promise<DependencyGraph> {
        return {
            deletionOrder: this.calculateDeletionOrder(),
            riskAssessment: await this.assessDeletionRisks(projectPath),
            backupRequirements: this.identifyBackupRequirements(),
        };
    }

    /** vercel.json を読み込む */
    private async readVercelConfig(projectPath: string): Promise<any | null> {
        const configPath = path.join(projectPath, "vercel.json");
        try {
            const configContent = await fs.readFile(configPath, "utf-8");
            return JSON.parse(configContent);
        } catch (error: any) {
            if (error?.code === "ENOENT") {
                return null;
            }
            throw error;
        }
    }

    /** Vercel 向け環境変数が存在するかを判定 */
    private hasVercelEnvVars(envVars: Record<string, string>): boolean {
        return Object.keys(envVars).some((key) => key.startsWith("VERCEL_"));
    }

    /** Vercel の環境変数を抽出 */
    private extractVercelEnvVars(envVars: Record<string, string>) {
        return Object.entries(envVars)
            .filter(([key]) => key.startsWith("VERCEL_"))
            .map(([key, value]) => ({
                key,
                value: this.maskSensitiveValue(value),
            }));
    }

    /** ドメイン設定を抽出 */
    private async discoverLinkedDomains(projectPath: string, vercelConfig: any | null): Promise<string[]> {
        if (vercelConfig?.alias) {
            return Array.isArray(vercelConfig.alias) ? vercelConfig.alias : [vercelConfig.alias];
        }

        const domainsFile = path.join(projectPath, "domains.json");
        try {
            const content = await fs.readFile(domainsFile, "utf-8");
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed.map(String);
            }
        } catch (error: any) {
            if (error?.code !== "ENOENT") {
                console.warn(`ドメイン情報の読み込みに失敗しました: ${error.message ?? error}`);
            }
        }

        return [];
    }

    /** データベース種別を判定 */
    private detectDatabaseType(envVars: Record<string, string>): "turso" | "supabase" | "none" {
        const provider = envVars.DATABASE_PROVIDER?.toLowerCase();
        if (provider === "turso" || provider === "libsql") {
            return "turso";
        }
        if (provider === "supabase" || provider === "postgres") {
            return "supabase";
        }

        if (
            Object.keys(envVars).some((key) => key.startsWith("TURSO_")) ||
            Object.keys(envVars).some((key) => key.startsWith("LIBSQL"))
        ) {
            return "turso";
        }

        if (Object.keys(envVars).some((key) => key.toLowerCase().includes("supabase"))) {
            return "supabase";
        }

        return "none";
    }

    /** Turso 関連のリソースを抽出 */
    private discoverTursoResources(
        envVarsByEnvironment: Record<EnvironmentKey, Record<string, string>>,
        sharedVars: Record<string, string>
    ): DatabaseResources {
        const resources: DatabaseResource[] = [];

        for (const [environment, envVars] of Object.entries(envVarsByEnvironment) as [
            EnvironmentKey,
            Record<string, string>,
        ][]) {
            const url = this.getEnvValueForEnvironment(
                envVars,
                ["TURSO_DATABASE_URL", "LIBSQL_DATABASE_URL"],
                environment,
                sharedVars
            );
            if (!url) {
                continue;
            }

            const token = this.getEnvValueForEnvironment(
                envVars,
                ["TURSO_AUTH_TOKEN", "LIBSQL_AUTH_TOKEN"],
                environment,
                sharedVars
            );

            resources.push({
                environment,
                identifier: this.extractDatabaseNameFromUrl(url),
                url,
                token,
            });
        }

        return {
            type: "turso",
            resources,
        };
    }

    /** Supabase 関連のリソースを抽出 */
    private discoverSupabaseResources(
        envVarsByEnvironment: Record<EnvironmentKey, Record<string, string>>,
        sharedVars: Record<string, string>
    ): DatabaseResources {
        const resources: DatabaseResource[] = [];

        for (const [environment, envVars] of Object.entries(envVarsByEnvironment) as [
            EnvironmentKey,
            Record<string, string>,
        ][]) {
            const url = this.getEnvValueForEnvironment(
                envVars,
                ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
                environment,
                sharedVars
            );
            if (!url) {
                continue;
            }

            const token = this.getEnvValueForEnvironment(
                envVars,
                ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE"],
                environment,
                sharedVars
            );

            resources.push({
                environment,
                identifier: this.extractSupabaseProjectRef(url),
                url,
                token,
            });
        }

        return {
            type: "supabase",
            resources,
        };
    }

    /** Blob ストア情報を抽出 */
    private extractBlobStores(
        envVarsByEnvironment: Record<EnvironmentKey, Record<string, string>>,
        sharedVars: Record<string, string>
    ): BlobStoreResource[] {
        const stores: BlobStoreResource[] = [];
        const usedIds = new Set<string>();

        for (const [environment, envVars] of Object.entries(envVarsByEnvironment) as [
            EnvironmentKey,
            Record<string, string>,
        ][]) {
            const storeId = this.getEnvValueForEnvironment(envVars, ["BLOB_STORE_ID"], environment, sharedVars);
            const token = this.getEnvValueForEnvironment(
                envVars,
                ["BLOB_READ_WRITE_TOKEN", "BLOB_RW_TOKEN"],
                environment,
                sharedVars
            );

            if (!(storeId && token)) {
                continue;
            }

            if (usedIds.has(storeId)) {
                continue;
            }

            stores.push({
                id: storeId,
                name: `${environment}-blob-store`,
                token,
            });
            usedIds.add(storeId);
        }

        return stores;
    }

    /** 環境別の環境変数を検索 */
    private getEnvValueForEnvironment(
        envVars: Record<string, string>,
        baseKeys: string[],
        environment: EnvironmentKey,
        sharedVars: Record<string, string>
    ): string | undefined {
        const suffixes: Record<EnvironmentKey, string[]> = {
            development: ["DEV", "DEVELOPMENT"],
            staging: ["STAGING", "STG"],
            production: ["PROD", "PRODUCTION"],
        };
        const candidates = suffixes[environment];

        for (const baseKey of baseKeys) {
            for (const suffix of candidates) {
                const withSuffix = `${baseKey}_${suffix}`;
                if (envVars[withSuffix]) {
                    return envVars[withSuffix];
                }
            }

            if (envVars[baseKey]) {
                return envVars[baseKey];
            }

            if (sharedVars[baseKey]) {
                return sharedVars[baseKey];
            }
        }

        return;
    }

    /** URL からデータベース名を抽出 */
    private extractDatabaseNameFromUrl(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.split(".")[0];
        } catch {
            return "unknown-database";
        }
    }

    /** URL から Supabase のプロジェクト Ref を抽出 */
    private extractSupabaseProjectRef(url: string): string {
        try {
            const parsed = new URL(url);
            return parsed.hostname.split(".")[0];
        } catch {
            return "unknown-project";
        }
    }

    /** 削除順序を定義 */
    private calculateDeletionOrder(): DeletionPriority[] {
        return [
            { type: "blob-store", priority: 1, dependencies: [] },
            { type: "vercel-project", priority: 2, dependencies: [] },
            { type: "turso-database", priority: 3, dependencies: [] },
            { type: "supabase-project", priority: 3, dependencies: [] },
        ];
    }

    /** リスク評価を組み立て */
    private async assessDeletionRisks(_projectPath: string): Promise<RiskAssessment> {
        return {
            overall: "medium",
            factors: [
                {
                    type: "data_loss",
                    severity: "high",
                    description: "データベースの削除により復旧不能となる可能性があります",
                    affectedResources: ["turso-database", "supabase-project"],
                },
                {
                    type: "service_disruption",
                    severity: "high",
                    description: "Vercel プロジェクト削除で公開サイトが停止します",
                    affectedResources: ["vercel-project"],
                },
            ],
            mitigations: [
                "削除前にバックアップを取得してください",
                "削除対象を段階的に確認してください",
                "削除後に監査ログを確認してください",
            ],
        };
    }

    /** バックアップ要件を定義 */
    private identifyBackupRequirements(): BackupRequirement[] {
        return [
            {
                resourceType: "vercel-project",
                resourceId: "*",
                required: true,
                backupType: "config",
                estimatedSize: "<1MB",
            },
            {
                resourceType: "turso-database",
                resourceId: "*",
                required: true,
                backupType: "data",
            },
            {
                resourceType: "supabase-project",
                resourceId: "*",
                required: true,
                backupType: "data",
            },
        ];
    }

    /** 環境変数ファイルを読み込んで統合 */
    private async readEnvironmentMap(projectPath: string): Promise<EnvironmentMap> {
        const shared = await this.mergeEnvFiles(projectPath, ENV_FILES.shared);
        const development = await this.mergeEnvFiles(projectPath, ENV_FILES.development);
        const staging = await this.mergeEnvFiles(projectPath, ENV_FILES.staging);
        const production = await this.mergeEnvFiles(projectPath, ENV_FILES.production);

        const byEnvironment: Record<EnvironmentKey, Record<string, string>> = {
            development: { ...shared, ...development },
            staging: { ...shared, ...staging },
            production: { ...shared, ...production },
        };

        const combined: Record<string, string> = {
            ...shared,
            ...development,
            ...staging,
            ...production,
        };

        return {
            combined,
            shared,
            byEnvironment,
        };
    }

    /** 複数の .env ファイルをマージ */
    private async mergeEnvFiles(projectPath: string, fileNames: string[]): Promise<Record<string, string>> {
        const result: Record<string, string> = {};
        for (const fileName of fileNames) {
            const absolute = path.join(projectPath, fileName);
            Object.assign(result, await this.readEnvFile(absolute));
        }
        return result;
    }

    /** 単一の .env ファイルを読み込む */
    private async readEnvFile(filePath: string): Promise<Record<string, string>> {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return this.parseEnvContent(content);
        } catch (error: any) {
            if (error?.code !== "ENOENT") {
                console.warn(`環境変数ファイル読み込みエラー (${filePath}): ${error.message ?? error}`);
            }
            return {};
        }
    }

    /** .env フォーマットを解析 */
    private parseEnvContent(content: string): Record<string, string> {
        const envVars: Record<string, string> = {};
        for (const rawLine of content.split("\n")) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) {
                continue;
            }

            const [rawKey, ...rest] = line.split("=");
            if (!rawKey) {
                continue;
            }

            const key = rawKey.trim();
            const value = rest
                .join("=")
                .trim()
                .replace(/^['"]|['"]$/g, "");
            envVars[key] = value;
        }
        return envVars;
    }

    /** 機密値をマスク */
    private maskSensitiveValue(value: string): string {
        if (value.length <= 8) {
            return "*".repeat(value.length);
        }
        return `${value.slice(0, 4)}${"*".repeat(value.length - 8)}${value.slice(-4)}`;
    }
}

// EOF
