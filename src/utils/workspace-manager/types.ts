/**
 * ワークスペース管理の型定義
 */

/**
 * アプリケーション情報
 */
export type AppInfo = {
    /** アプリ名 */
    name: string;
    /** アプリタイプ */
    type: "nextjs" | "expo" | "tauri" | "backend" | "library";
    /** アプリのパス */
    path: string;
    /** アプリのスクリプト */
    scripts: Record<string, string>;
    /** package.jsonの内容 */
    packageJson: any;
};

/**
 * パッケージ情報
 */
export type PackageInfo = {
    /** パッケージ名 */
    name: string;
    /** パッケージタイプ */
    type: "library" | "config" | "shared";
    /** パッケージのパス */
    path: string;
    /** エクスポート情報 */
    exports: Record<string, string>;
    /** package.jsonの内容 */
    packageJson: any;
};

/**
 * ワークスペース設定
 */
export type WorkspaceConfig = {
    /** ルートパス */
    rootPath: string;
    /** アプリケーション一覧 */
    apps: AppInfo[];
    /** パッケージ一覧 */
    packages: PackageInfo[];
    /** ワークスペース設定ファイルのパス */
    workspaceFile?: string;
};

/**
 * スクリプトマップ
 */
export type ScriptMap = Record<string, string>;

/**
 * 実行コンテキスト
 */
export type ExecutionContext = {
    /** 実行タイプ */
    type: "monorepo-root" | "app-directory" | "standalone";
    /** ルートパス */
    rootPath: string;
    /** 現在のアプリ名（該当する場合） */
    currentApp: string | null;
};

/**
 * 実行結果
 */
export type ExecutionResult = {
    /** アプリ名 */
    app: string;
    /** 実行コマンド */
    command: string;
    /** 終了コード */
    exitCode: number;
    /** 成功フラグ */
    success: boolean;
    /** 標準出力 */
    stdout?: string;
    /** 標準エラー */
    stderr?: string;
    /** 実行時間（ミリ秒） */
    duration?: number;
};

/**
 * 集約結果
 */
export type AggregatedResult = {
    /** 全体の成功フラグ */
    success: boolean;
    /** 成功したアプリ数 */
    successCount: number;
    /** 失敗したアプリ数 */
    failureCount: number;
    /** 個別結果 */
    results: ExecutionResult[];
    /** 総実行時間 */
    totalDuration: number;
};

/**
 * 実行フィルター
 */
export type ExecutionFilter = {
    /** フィルタータイプ */
    type: "app-name" | "app-type" | "script-exists" | "changed-files";
    /** フィルター値 */
    value: string | string[];
};

/**
 * 環境変数
 */
export type EnvironmentVariables = Record<string, string>;

/**
 * 環境変数ファイルパス
 */
export type EnvFilePaths = {
    /** 開発環境 */
    development: string;
    /** ステージング環境 */
    staging: string;
    /** 本番環境 */
    production: string;
    /** ローカル環境 */
    local: string;
};

/**
 * 検証結果
 */
export type ValidationResult = {
    /** 有効フラグ */
    valid: boolean;
    /** 失敗理由 */
    reason?: string;
    /** 重要度 */
    severity?: "low" | "medium" | "high" | "critical";
};

/**
 * 回復結果
 */
export type RecoveryResult = {
    /** 回復成功フラグ */
    recovered: boolean;
    /** 実行したアクション */
    action: string;
    /** メッセージ */
    message: string;
    /** 提案事項 */
    suggestions?: string[];
};

/**
 * モノレポエラータイプ
 */
export const MonorepoErrorType = {
    WORKSPACE_NOT_FOUND: "workspace_not_found",
    SCRIPT_NOT_FOUND: "script_not_found",
    EXECUTION_FAILED: "execution_failed",
    DEPENDENCY_MISSING: "dependency_missing",
    PATH_RESOLUTION_FAILED: "path_resolution_failed",
    PERMISSION_DENIED: "permission_denied",
} as const;

export type MonorepoErrorType =
    (typeof MonorepoErrorType)[keyof typeof MonorepoErrorType];

/**
 * モノレポエラー
 */
export type MonorepoError = {
    /** エラータイプ */
    type: MonorepoErrorType;
    /** エラーメッセージ */
    message: string;
    /** 要求されたスクリプト */
    requestedScript?: string;
    /** 元のエラー */
    originalError?: Error;
};

// EOF
