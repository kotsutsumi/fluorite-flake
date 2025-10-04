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
