/**
 * ダッシュボードデータインターフェース定義
 *
 * ダッシュボードの状態管理、プロジェクト管理、
 * UIコンポーネントのデータ構造の型定義を提供
 *
 * 新しいマルチサービスダッシュボードアーキテクチャに対応
 */

// 外部使用向けのサービスアダプター型の再エクスポート
export type {
    ServiceAdapter,
    ServiceCapabilities,
    ServiceConfig,
    AuthConfig,
    ServiceDashboardData,
    LogEntry,
    Resource,
    ServiceAction,
    ActionResult,
    HealthStatus,
    DashboardDataOptions,
    MetricsOptions,
    LogOptions,
    TimeRange,
    PaginationOptions,
    PerformanceMetrics,
    UsageMetrics,
    ErrorMetrics,
    MetricValue,
    ServiceMetrics,
    LogLevel,
    ResourceStatus,
    EventCallback,
    ServiceEvent,
    BaseServiceAdapter,
    ServiceFactory,
    ServiceInfo,
} from '../services/base-service-adapter/index.js';

// Import ServiceMetrics separately to avoid circular dependency
import type { ServiceMetrics } from '../services/base-service-adapter/index.js';

// ダッシュボードオーケストレーター型の再エクスポート
export type {
    DashboardConfig,
    MultiServiceDashboardData,
    AggregatedMetrics,
    DashboardInsight,
    ServiceRegistry,
    DashboardOrchestrator,
} from '../dashboard/dashboard-orchestrator.js';

// サービスファクトリー型の再エクスポート
export type {
    DefaultServiceFactory,
    ServiceRegistry as ServiceRegistryClass,
    SupportedService,
} from '../services/service-factory/index.js';

// ServiceMetricsとServiceStatusは上記で既に再エクスポート済み

/**
 * プロジェクト管理関連の型定義
 */

/**
 * プロジェクトの基本情報と設定を表すインターフェース
 * プロジェクトの識別情報、状態、設定、統計データを含む
 */
export interface Project {
    id: string; // プロジェクトの一意識別子
    name: string; // プロジェクト名
    framework: 'nextjs' | 'expo' | 'tauri' | 'flutter'; // 使用フレームワーク
    path: string; // プロジェクトのファイルシステムパス
    status: 'active' | 'inactive' | 'building' | 'error'; // プロジェクトの現在の状態
    createdAt: number; // 作成日時（Unix timestamp）
    updatedAt: number; // 最終更新日時（Unix timestamp）
    metadata: ProjectMetadata; // プロジェクトのメタデータ
    configuration: ProjectConfiguration; // プロジェクトの設定情報
    statistics: ProjectStatistics; // プロジェクトの統計データ
}

/**
 * プロジェクトのメタデータ情報
 * 説明、バージョン、作成者などの補助的な情報を格納
 */
export interface ProjectMetadata {
    description?: string; // プロジェクトの説明文
    version?: string; // プロジェクトのバージョン
    author?: string; // プロジェクト作成者
    tags: string[]; // プロジェクトに付与されたタグ
    repository?: string; // リポジトリURL
    lastActivity?: number; // 最終活動日時（Unix timestamp）
    thumbnailPath?: string; // プロジェクトのサムネイル画像パス
}

/**
 * プロジェクトの設定情報
 * データベース、ORM、ストレージなどの技術的な設定を管理
 */
export interface ProjectConfiguration {
    database: 'none' | 'turso' | 'supabase'; // 使用するデータベース
    orm?: 'prisma' | 'drizzle'; // 使用するORMライブラリ
    deployment: boolean; // デプロイメント設定の有無
    storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage'; // ストレージプロバイダー
    auth: boolean; // 認証機能の有無
    packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'; // パッケージマネージャー
    customConfigurations?: Record<string, unknown>; // カスタム設定項目
}

/**
 * プロジェクトの統計データ
 * ビルド回数、成功率、パフォーマンス指標などを追跡
 */
export interface ProjectStatistics {
    buildCount: number; // 総ビルド回数
    deploymentCount: number; // 総デプロイ回数
    lastBuildTime?: number; // 最終ビルド実行時間（Unix timestamp）
    lastDeploymentTime?: number; // 最終デプロイ時間（Unix timestamp）
    buildSuccessRate: number; // ビルド成功率（0-1の値）
    averageBuildDuration: number; // 平均ビルド時間（ミリ秒）
    fileCount?: number; // プロジェクト内のファイル数
    lineCount?: number; // プロジェクト内の総行数
    dependencyCount?: number; // 依存関係の数
}

/**
 * ビルドとデプロイメント関連の型定義
 */

/**
 * ビルドプロセスの詳細情報
 * ビルドの実行状態、ログ、成果物、設定を管理
 */
export interface BuildProcess {
    id: string; // ビルドプロセスの一意識別子
    projectId: string; // 対象プロジェクトのID
    type: 'development' | 'production' | 'preview'; // ビルドタイプ
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'; // ビルド状態
    startTime: number; // ビルド開始時間（Unix timestamp）
    endTime?: number; // ビルド終了時間（Unix timestamp）
    duration?: number; // ビルド実行時間（ミリ秒）
    logs: BuildLog[]; // ビルドログの配列
    artifacts: BuildArtifact[]; // ビルド成果物の配列
    configuration: BuildConfiguration; // ビルド設定
    triggeredBy: string; // ビルドの実行者またはトリガー
}

/**
 * ビルドログエントリ
 * ビルド実行中の各ログメッセージとメタデータ
 */
export interface BuildLog {
    id: string; // ログエントリの一意識別子
    timestamp: number; // ログ出力時間（Unix timestamp）
    level: 'debug' | 'info' | 'warn' | 'error'; // ログレベル
    message: string; // ログメッセージ
    source: string; // ログの出力元
    metadata?: Record<string, unknown>; // ログの追加メタデータ
}

/**
 * ビルド成果物
 * ビルド完了後に生成されるファイルやアセットの情報
 */
export interface BuildArtifact {
    id: string; // 成果物の一意識別子
    name: string; // 成果物の名前
    type: 'bundle' | 'source-map' | 'asset' | 'report'; // 成果物のタイプ
    path: string; // 成果物のファイルパス
    size: number; // ファイルサイズ（バイト）
    checksum: string; // ファイルのチェックサム
    createdAt: number; // 作成日時（Unix timestamp）
}

/**
 * ビルド設定
 * ビルド実行時の各種オプションと環境変数
 */
export interface BuildConfiguration {
    target: string; // ビルドターゲット
    optimization: boolean; // 最適化の有無
    minification: boolean; // 圧縮の有無
    sourceMap: boolean; // ソースマップ生成の有無
    environment: Record<string, string>; // 環境変数
    customFlags?: string[]; // カスタムビルドフラグ
}

/**
 * サービスとプロセス管理関連の型定義
 */

/**
 * サービスの実行状態
 * 各サービスのステータス、リソース使用量、設定を管理
 */
export interface ServiceStatus {
    id: string; // サービスの一意識別子
    name: string; // サービス名
    type: 'cli-adapter' | 'build-server' | 'dev-server' | 'database' | 'external'; // サービスタイプ
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error'; // サービス状態
    pid?: number; // プロセスID
    port?: number; // 使用ポート番号
    uptime?: number; // 稼働時間（ミリ秒）
    memoryUsage?: number; // メモリ使用量（バイト）
    cpuUsage?: number; // CPU使用率（0-100）
    lastHeartbeat?: number; // 最終ヘルスチェック時間（Unix timestamp）
    configuration: ServiceConfiguration; // サービス設定
    metrics: ServiceMetrics; // サービス指標
}

/**
 * サービス設定
 * サービスの動作制御とヘルスチェック設定
 */
export interface ServiceConfiguration {
    autoRestart: boolean; // 自動再起動の有無
    maxRestarts: number; // 最大再起動回数
    healthCheckInterval: number; // ヘルスチェック間隔（ミリ秒）
    timeout: number; // タイムアウト時間（ミリ秒）
    environment: Record<string, string>; // 環境変数
    dependencies: string[]; // 依存サービスのID配列
}

/**
 * ファイルシステムとプロジェクト構造関連の型定義
 */

/**
 * ファイルシステムノード
 * ファイルとディレクトリの階層構造を表現
 */
export interface FileSystemNode {
    id: string; // ノードの一意識別子
    name: string; // ファイル/ディレクトリ名
    path: string; // 絶対パス
    type: 'file' | 'directory'; // ノードタイプ
    size?: number; // ファイルサイズ（バイト）
    modifiedAt: number; // 最終更新日時（Unix timestamp）
    permissions?: string; // ファイル権限
    children?: FileSystemNode[]; // 子ノード（ディレクトリの場合）
    isExpanded?: boolean; // UI上での展開状態
    metadata?: FileMetadata; // ファイルメタデータ
}

/**
 * ファイルメタデータ
 * ファイルの詳細情報とGit状態
 */
export interface FileMetadata {
    language?: string; // プログラミング言語
    lineCount?: number; // 行数
    encoding?: string; // 文字エンコーディング
    gitStatus?: 'added' | 'modified' | 'deleted' | 'untracked' | 'staged'; // Git状態
    isGenerated?: boolean; // 自動生成ファイルか
    lastEditor?: string; // 最終編集者
}

/**
 * ダッシュボードUI状態管理の型定義
 */

/**
 * ダッシュボードの全体状態
 * UI表示、選択状態、フィルター設定を管理
 */
export interface DashboardState {
    activeProject?: string; // アクティブなプロジェクトID
    selectedFiles: string[]; // 選択中のファイルパス配列
    openTabs: TabState[]; // 開いているタブの状態
    sidebarVisible: boolean; // サイドバーの表示状態
    theme: 'light' | 'dark' | 'auto'; // テーマ設定
    layout: LayoutConfiguration; // レイアウト設定
    notifications: Notification[]; // 通知一覧
    filters: FilterConfiguration; // フィルター設定
}

/**
 * タブ状態
 * 各タブの種類、内容、アクティブ状態を管理
 */
export interface TabState {
    id: string; // タブの一意識別子
    type: 'file' | 'terminal' | 'build-log' | 'settings'; // タブタイプ
    title: string; // タブタイトル
    path?: string; // ファイルパス（ファイルタブの場合）
    isActive: boolean; // アクティブ状態
    isDirty?: boolean; // 未保存の変更があるか
    metadata?: Record<string, unknown>; // タブ固有のメタデータ
}

/**
 * レイアウト設定
 * ダッシュボードのパネル構成とサイズ調整
 */
export interface LayoutConfiguration {
    primaryPanel: 'explorer' | 'build' | 'deploy' | 'settings'; // メインパネルの種類
    secondaryPanel?: 'terminal' | 'logs' | 'metrics'; // セカンダリパネルの種類
    panelSizes: Record<string, number>; // 各パネルのサイズ（ピクセル）
    isSecondaryPanelCollapsed: boolean; // セカンダリパネルの折りたたみ状態
}

/**
 * 通知
 * システムからユーザーへの各種通知メッセージ
 */
export interface Notification {
    id: string; // 通知の一意識別子
    type: 'info' | 'success' | 'warning' | 'error'; // 通知タイプ
    title: string; // 通知タイトル
    message: string; // 通知メッセージ
    timestamp: number; // 通知時間（Unix timestamp）
    isRead: boolean; // 既読状態
    actions?: NotificationAction[]; // 実行可能なアクション
    autoClose?: number; // 自動閉じるまでの時間（ミリ秒）
}

/**
 * 通知アクション
 * 通知に対してユーザーが実行できるアクション
 */
export interface NotificationAction {
    id: string; // アクションの一意識別子
    label: string; // ボタンラベル
    action: string; // 実行するアクション名
    style?: 'primary' | 'secondary' | 'danger'; // ボタンスタイル
}

/**
 * フィルター設定
 * プロジェクトやファイルの表示フィルタリング条件
 */
export interface FilterConfiguration {
    projectStatus?: string[]; // プロジェクト状態フィルター
    fileTypes?: string[]; // ファイルタイプフィルター
    dateRange?: { start: number; end: number }; // 日付範囲フィルター
    tags?: string[]; // タグフィルター
    buildTypes?: string[]; // ビルドタイプフィルター
}

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

/**
 * 検索・発見機能関連の型定義
 */

/**
 * 検索クエリ
 * ファイル、プロジェクト、ログなどの横断検索条件
 */
export interface SearchQuery {
    text: string; // 検索キーワード
    type?: 'files' | 'projects' | 'logs' | 'all'; // 検索対象タイプ
    filters?: SearchFilter[]; // 詳細フィルター条件
    sortBy?: string; // ソート基準フィールド
    sortOrder?: 'asc' | 'desc'; // ソート順序
    limit?: number; // 取得件数上限
    offset?: number; // 取得開始位置
}

/**
 * 検索フィルター
 * 詳細な検索条件を指定するためのフィルター
 */
export interface SearchFilter {
    field: string; // フィルター対象フィールド
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'starts_with' | 'ends_with'; // 比較演算子
    value: unknown; // フィルター値
}

/**
 * 検索結果
 * 検索で見つかった項目の詳細情報
 */
export interface SearchResult {
    id: string; // 結果項目の一意識別子
    type: 'file' | 'project' | 'log' | 'build'; // 結果の種類
    title: string; // 表示タイトル
    description?: string; // 説明文
    path?: string; // ファイルパス（該当する場合）
    score: number; // 関連度スコア
    highlights?: SearchHighlight[]; // ハイライト情報
    metadata?: Record<string, unknown>; // 追加メタデータ
}

/**
 * 検索ハイライト
 * 検索結果内でマッチした部分のハイライト情報
 */
export interface SearchHighlight {
    field: string; // ハイライト対象フィールド
    fragments: string[]; // ハイライトされたテキスト断片
}

/**
 * リアルタイムコラボレーション関連の型定義
 */

/**
 * コラボレーションセッション
 * 複数人でのリアルタイム共同編集セッション
 */
export interface CollaborationSession {
    id: string; // セッションの一意識別子
    projectId: string; // 対象プロジェクトのID
    participants: Participant[]; // 参加者一覧
    createdAt: number; // セッション開始時刻（Unix timestamp）
    lastActivity: number; // 最終活動時刻（Unix timestamp）
    isActive: boolean; // セッションのアクティブ状態
}

/**
 * 参加者
 * コラボレーションセッションの参加者情報
 */
export interface Participant {
    id: string; // 参加者の一意識別子
    name: string; // 参加者名
    avatar?: string; // アバター画像URL
    role: 'owner' | 'editor' | 'viewer'; // 権限レベル
    isOnline: boolean; // オンライン状態
    lastSeen?: number; // 最終アクセス時刻（Unix timestamp）
    cursor?: CursorPosition; // 現在のカーソル位置
}

/**
 * カーソル位置
 * エディタ内での参加者のカーソル位置と選択範囲
 */
export interface CursorPosition {
    fileId: string; // 対象ファイルのID
    line: number; // 行番号（0ベース）
    column: number; // 列番号（0ベース）
    selection?: { start: number; end: number }; // 選択範囲（文字位置）
}
