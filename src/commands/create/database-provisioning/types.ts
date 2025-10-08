/**
 * データベースプロビジョニング関連の型定義
 */

/**
 * データベースプロビジョニング設定
 */
export type DatabaseProvisioningConfig = {
    /** データベースタイプ */
    type: "turso" | "supabase";
    /** DBプロバイダ */
    provider: "turso" | "supabase";
    /** 作成モード */
    mode: "create" | "existing" | "link";
    /** データベース名 */
    databaseName: string;
    /** 環境別の命名設定 */
    naming: {
        dev: string;
        staging: string;
        prod: string;
    };
    /** 詳細オプション */
    options: {
        /** 既存データの保持 */
        preserveData: boolean;
        /** 自動マイグレーション */
        autoMigrate: boolean;
        /** プロビジョニングをスキップ */
        skipProvisioning: boolean;
    };
};

/**
 * データベース認証情報
 */
export type DatabaseCredentials = {
    /** 環境別のデータベースURL */
    urls: Record<"dev" | "staging" | "prod", string>;
    /** 環境別の認証トークン */
    tokens: Record<"dev" | "staging" | "prod", string>;
};

/**
 * プロビジョニング結果
 */
export type ProvisioningResult = {
    /** 成功フラグ */
    success: boolean;
    /** 認証情報 */
    credentials?: DatabaseCredentials;
    /** エラーメッセージ */
    error?: string;
    /** 作成されたデータベース一覧 */
    databases?: {
        environment: "dev" | "staging" | "prod";
        name: string;
        url: string;
        status: "created" | "existing" | "failed";
    }[];
    /** セットアップ手順 */
    setupInstructions?: string[];
};

/**
 * 検証結果
 */
export type ValidationResult = {
    /** 検証成功フラグ */
    valid: boolean;
    /** エラーメッセージ一覧 */
    errors: string[];
    /** 警告メッセージ一覧 */
    warnings: string[];
};

/**
 * Tursoプロビジョニングオプション
 */
export type TursoProvisioningOptions = {
    /** プロジェクト名 */
    projectName: string;
    /** 対象環境一覧 */
    environments: ("dev" | "staging" | "prod")[];
    /** 既存データの保持 */
    preserveExisting: boolean;
    /** データベースの場所 */
    location?: string;
    /** 既存データベース使用時の命名設定 */
    existingNaming?: { dev: string; staging: string; prod: string };
};

/**
 * Supabaseプロビジョニングオプション
 */
export type SupabaseProvisioningOptions = {
    /** プロジェクト名 */
    projectName: string;
    /** 対象環境一覧 */
    environments: ("dev" | "staging" | "prod")[];
    /** 組織ID */
    organization?: string;
    /** リージョン */
    region?: string;
    /** プラン */
    plan?: "free" | "pro";
};

/**
 * データベース情報
 */
export type DatabaseInfo = {
    /** データベース名 */
    name: string;
    /** URL */
    url: string;
    /** プロバイダ */
    provider: "turso" | "supabase";
    /** 環境 */
    environment: "dev" | "staging" | "prod";
    /** ステータス */
    status: "active" | "inactive" | "creating" | "error";
};

/**
 * プロビジョニングエラータイプ
 */
export type DatabaseProvisioningErrorType =
    | "AUTHENTICATION_FAILED"
    | "QUOTA_EXCEEDED"
    | "NETWORK_ERROR"
    | "NAMING_CONFLICT"
    | "PERMISSION_DENIED"
    | "UNKNOWN_ERROR";

/**
 * プロビジョニングエラー
 */
export type DatabaseProvisioningError = Error & {
    /** エラータイプ */
    type: DatabaseProvisioningErrorType;
    /** プロバイダ */
    provider: "turso" | "supabase";
    /** コンテキスト情報 */
    context?: Record<string, unknown>;
};

/**
 * エラー回復結果
 */
export type ErrorRecoveryResult = {
    /** 回復成功フラグ */
    recovered: boolean;
    /** 実行したアクション */
    action: string;
    /** 追加メッセージ */
    message?: string;
};

/**
 * プロビジョニングコンテキスト
 */
export type ProvisioningContext = {
    /** プロジェクト名 */
    projectName: string;
    /** 設定 */
    config: DatabaseProvisioningConfig;
    /** 現在の環境 */
    currentEnvironment?: "dev" | "staging" | "prod";
};

/**
 * リトライオプション
 */
export type RetryOptions = {
    /** 最大試行回数 */
    maxAttempts?: number;
    /** 初期遅延時間（ms） */
    initialDelay?: number;
    /** 最大遅延時間（ms） */
    maxDelay?: number;
    /** バックオフ倍率 */
    backoffMultiplier?: number;
};

/**
 * セキュリティレポート
 */
export type SecurityReport = {
    /** セキュリティスコア（0-100） */
    score: number;
    /** 問題一覧 */
    issues: {
        /** 重要度 */
        severity: "low" | "medium" | "high" | "critical";
        /** 問題の説明 */
        description: string;
        /** 推奨される対処法 */
        recommendation: string;
    }[];
    /** 通過した検査項目 */
    passed: string[];
};

// EOF
