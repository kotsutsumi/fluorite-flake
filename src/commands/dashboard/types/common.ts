/**
 * ダッシュボード共通型定義
 */

// サービスタイプ
export type ServiceType = "vercel" | "turso" | "supabase" | "github";

// タブタイプ
export type TabType = "overview" | "operations" | "logs" | "metrics";

// フォーカス領域タイプ
export type FocusArea = "services" | "tabs" | "shortcuts";

// 認証ステータス
export type AuthStatus = "unknown" | "authenticated" | "unauthenticated" | "error";

// ダッシュボード状態
export type DashboardState = {
    // UI状態
    activeService: ServiceType;
    activeTab: TabType;
    activeFocus: FocusArea;
    isLoading: boolean;
    errorMessage?: string;

    // 認証状態
    authStatus: Record<ServiceType, AuthStatus>;

    // データキャッシュ
    dataCache: Map<string, unknown>;
    lastRefresh: Date;
};

// サービス情報
export type ServiceInfo = {
    name: string;
    description: string;
    isAvailable: boolean;
    authRequired: boolean;
};

// メトリクスデータ
export type MetricsData = {
    timestamp: Date;
    value: number;
    label: string;
};

// チャートプロパティ
export type ChartProps = {
    data: number[];
    title: string;
    height?: number;
    width?: number;
    color?: string;
};

// エラー情報
export type DashboardError = {
    service: ServiceType;
    code: string;
    message: string;
    timestamp: Date;
};

// キーバインディング
export type KeyBinding = {
    key: string;
    description: string;
    action: () => void;
};

// EOF
