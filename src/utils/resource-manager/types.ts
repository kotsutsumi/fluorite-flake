/**
 * リソース管理関連の型定義
 */

/**
 * プロジェクト全体のリソースインベントリ
 */
export type ProjectInventory = {
    /** プロジェクト名 */
    projectName: string;
    /** プロジェクトパス */
    projectPath: string;
    /** Vercelリソース */
    vercel?: VercelResources;
    /** データベースリソース */
    databases?: DatabaseResources;
    /** ストレージリソース */
    storage?: StorageResources;
    /** 依存関係情報 */
    dependencies: DependencyGraph;
};

/**
 * Vercelリソース情報
 */
export type VercelResources = {
    /** プロジェクトID */
    projectId?: string;
    /** 組織ID */
    orgId?: string;
    /** ドメイン一覧 */
    domains: string[];
    /** 環境変数 */
    environmentVariables: EnvironmentVariable[];
};

/**
 * データベースリソース情報
 */
export type DatabaseResources = {
    /** データベースタイプ */
    type: "turso" | "supabase" | "none";
    /** リソース一覧 */
    resources: DatabaseResource[];
};

/**
 * 個別データベースリソース
 */
export type DatabaseResource = {
    /** 環境 */
    environment: "development" | "staging" | "production";
    /** データベース名またはプロジェクトRef */
    identifier: string;
    /** 接続URL */
    url?: string;
    /** 認証トークン */
    token?: string;
};

/**
 * ストレージリソース情報
 */
export type StorageResources = {
    /** Blobストア一覧 */
    blobStores: BlobStoreResource[];
};

/**
 * Blobストアリソース
 */
export type BlobStoreResource = {
    /** ストアID */
    id: string;
    /** ストア名 */
    name: string;
    /** アクセストークン */
    token: string;
};

/**
 * 環境変数情報
 */
export type EnvironmentVariable = {
    /** キー */
    key: string;
    /** 値（マスキング済み） */
    value: string;
    /** 環境 */
    environment?: string;
};

/**
 * 依存関係グラフ
 */
export type DependencyGraph = {
    /** 削除順序 */
    deletionOrder: DeletionPriority[];
    /** リスク評価 */
    riskAssessment: RiskAssessment;
    /** バックアップ要件 */
    backupRequirements: BackupRequirement[];
};

/**
 * 削除優先度
 */
export type DeletionPriority = {
    /** リソースタイプ */
    type: ResourceType;
    /** 優先度（1が最優先） */
    priority: number;
    /** 依存関係 */
    dependencies: string[];
};

/**
 * リスク評価
 */
export type RiskAssessment = {
    /** 全体リスクレベル */
    overall: "low" | "medium" | "high" | "critical";
    /** リスク要因 */
    factors: RiskFactor[];
    /** 軽減策 */
    mitigations: string[];
};

/**
 * リスク要因
 */
export type RiskFactor = {
    /** リスクタイプ */
    type:
        | "data_loss"
        | "service_disruption"
        | "dependency_break"
        | "cost_impact";
    /** 重要度 */
    severity: "low" | "medium" | "high" | "critical";
    /** 説明 */
    description: string;
    /** 影響を受けるリソース */
    affectedResources: string[];
};

/**
 * バックアップ要件
 */
export type BackupRequirement = {
    /** リソースタイプ */
    resourceType: ResourceType;
    /** リソース識別子 */
    resourceId: string;
    /** 必須バックアップ */
    required: boolean;
    /** バックアップタイプ */
    backupType: "config" | "data" | "full";
    /** 推定サイズ */
    estimatedSize?: string;
};

/**
 * リソースタイプ
 */
export type ResourceType =
    | "vercel-project"
    | "turso-database"
    | "supabase-project"
    | "blob-store"
    | "environment-variables"
    | "domains";

/**
 * リソース選択情報
 */
export type ResourceSelection = {
    /** 選択されたリソースタイプ */
    selectedTypes: ResourceType[];
    /** 削除範囲 */
    scope: "development" | "staging" | "production" | "all";
    /** 環境別選択 */
    environments: string[];
    /** 特定リソース除外 */
    excludedResources: string[];
};

/**
 * クリーンアップ計画
 */
export type CleanupPlan = {
    /** プロジェクト名 */
    projectName: string;
    /** 削除ステップ */
    steps: DeletionStep[];
    /** 削除対象リソース */
    targetResources: ResourceSelection;
    /** 実行前バックアップ */
    backupPlan: BackupPlan;
    /** 推定実行時間 */
    estimatedDuration: number;
    /** リスクレベル */
    riskLevel: "low" | "medium" | "high" | "critical";
};

/**
 * 削除ステップ
 */
export type DeletionStep = {
    /** ステップID */
    id: string;
    /** ステップタイプ */
    type: ResourceType;
    /** 説明 */
    description: string;
    /** パラメータ */
    parameters: Record<string, any>;
    /** 環境 */
    environment?: string;
    /** 実行順序 */
    order: number;
    /** バックアップ必要性 */
    requiresBackup: boolean;
    /** ロールバックデータ */
    rollbackData?: any;
    /** 依存関係 */
    dependencies: string[];
};

/**
 * バックアップ計画
 */
export type BackupPlan = {
    /** バックアップエントリ */
    entries: BackupEntry[];
    /** 推定サイズ */
    estimatedSize: number;
    /** 保存先 */
    destination: string;
};

/**
 * バックアップエントリ
 */
export type BackupEntry = {
    /** リソースタイプ */
    type: ResourceType;
    /** リソースID */
    resourceId: string;
    /** バックアップファイルパス */
    filePath?: string;
    /** ステータス */
    status: "pending" | "completed" | "failed" | "skipped";
    /** エラーメッセージ */
    error?: string;
    /** ファイルサイズ */
    size?: number;
    /** メタデータ */
    metadata?: Record<string, any>;
};

/**
 * クリーンアップ結果
 */
export type CleanupResult = {
    /** 実行成功 */
    success: boolean;
    /** 完了したステップ数 */
    completedSteps: number;
    /** 失敗したステップ数 */
    failedSteps: number;
    /** ステップ結果 */
    stepResults: DeletionStepResult[];
    /** ロールバック実行済み */
    rollbackPerformed: boolean;
    /** 実行時間 */
    totalDuration: number;
    /** エラーメッセージ */
    error?: string;
};

/**
 * 削除ステップ結果
 */
export type DeletionStepResult = {
    /** ステップ情報 */
    step: DeletionStep;
    /** 実行成功 */
    success: boolean;
    /** 実行時間 */
    duration: number;
    /** エラーメッセージ */
    error?: string;
    /** ロールバックデータ */
    rollbackData?: any;
};

/**
 * リソースインベントリ（外部用）
 */
export type ResourceInventory = ProjectInventory;

// EOF
