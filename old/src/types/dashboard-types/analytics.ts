/**
 * 分析・監視関連の型定義
 */

/**
 * 分析データ
 * プロジェクト活動、ビルド傾向、パフォーマンス指標の統合データ
 */
export interface AnalyticsData {
    projectActivity: ProjectActivity[]; // プロジェクト活動履歴
    buildTrends: BuildTrend[]; // ビルド傾向データ
    performanceMetrics: PerformanceMetric[]; // パフォーマンス指標
    userActivity: UserActivity[]; // ユーザー活動履歴
    systemHealth: SystemHealthMetric[]; // システムヘルス指標
}

/**
 * プロジェクト活動記録
 * プロジェクトに対して実行された各種操作の履歴
 */
export interface ProjectActivity {
    projectId: string; // 対象プロジェクトのID
    timestamp: number; // 活動発生時刻（Unix timestamp）
    action: 'created' | 'opened' | 'built' | 'deployed' | 'edited'; // 実行された操作
    metadata?: Record<string, unknown>; // 操作に関する追加情報
}

/**
 * ビルド傾向データ
 * 日次のビルド実行統計と成功率の推移
 */
export interface BuildTrend {
    date: string; // 対象日（YYYY-MM-DD形式）
    buildCount: number; // 当日の総ビルド数
    successCount: number; // 成功したビルド数
    failureCount: number; // 失敗したビルド数
    averageDuration: number; // 平均ビルド時間（ミリ秒）
}

/**
 * パフォーマンス指標
 * システムリソースの使用状況を記録する指標
 */
export interface PerformanceMetric {
    timestamp: number; // 計測時刻（Unix timestamp）
    metric: 'cpu' | 'memory' | 'disk' | 'network'; // 指標の種類
    value: number; // 計測値
    unit: string; // 単位（%, MB, GB/s など）
    source: string; // 計測元（サービス名やコンポーネント名）
}

/**
 * ユーザー活動記録
 * ユーザーの操作履歴と作業時間の追跡
 */
export interface UserActivity {
    timestamp: number; // 活動開始時刻（Unix timestamp）
    action: string; // 実行したアクション名
    duration?: number; // 活動時間（ミリ秒）
    projectId?: string; // 関連するプロジェクトID
    metadata?: Record<string, unknown>; // 活動に関する追加情報
}

/**
 * システムヘルス指標
 * システム各コンポーネントの健全性状態を監視
 */
export interface SystemHealthMetric {
    timestamp: number; // 計測時刻（Unix timestamp）
    component: string; // 監視対象コンポーネント名
    status: 'healthy' | 'warning' | 'critical'; // ヘルス状態
    value?: number; // 数値指標（該当する場合）
    message?: string; // 状態に関するメッセージ
    details?: Record<string, unknown>; // 詳細情報
}
