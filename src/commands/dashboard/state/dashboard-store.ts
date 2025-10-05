/**
 * ダッシュボードメインストア - valtioベース状態管理
 */

import { proxy } from "valtio";
import type {
    AuthStatus,
    DashboardState,
    ServiceType,
    TabType,
} from "../types/common.js";

/**
 * ダッシュボードのグローバル状態
 */
export const dashboardStore = proxy<DashboardState>({
    // UI状態
    activeService: "vercel" as ServiceType,
    activeTab: "overview" as TabType,
    isLoading: false,
    errorMessage: undefined,

    // 認証状態（初期値は全て不明）
    authStatus: {
        vercel: "unknown",
        turso: "unknown",
        supabase: "unknown",
        github: "unknown",
    } as Record<ServiceType, AuthStatus>,

    // データキャッシュ
    dataCache: new Map(),
    lastRefresh: new Date(),
});

/**
 * サービスを変更する
 * @param service 変更先のサービス
 */
export function setActiveService(service: ServiceType): void {
    dashboardStore.activeService = service;
    dashboardStore.activeTab = "overview"; // タブをリセット
}

/**
 * タブを変更する
 * @param tab 変更先のタブ
 */
export function setActiveTab(tab: TabType): void {
    dashboardStore.activeTab = tab;
}

/**
 * ローディング状態を設定する
 * @param isLoading ローディング中かどうか
 */
export function setLoading(isLoading: boolean): void {
    dashboardStore.isLoading = isLoading;
}

/**
 * エラーメッセージを設定する
 * @param message エラーメッセージ（未定義の場合はクリア）
 */
export function setErrorMessage(message?: string): void {
    dashboardStore.errorMessage = message;
}

/**
 * 認証状態を更新する
 * @param service サービス
 * @param status 認証状態
 */
export function setAuthStatus(service: ServiceType, status: AuthStatus): void {
    dashboardStore.authStatus[service] = status;
}

/**
 * キャッシュにデータを保存する
 * @param key キー
 * @param data データ
 */
export function setCacheData(key: string, data: unknown): void {
    dashboardStore.dataCache.set(key, data);
    dashboardStore.lastRefresh = new Date();
}

/**
 * キャッシュからデータを取得する
 * @param key キー
 * @returns キャッシュされたデータ
 */
export function getCacheData<T = unknown>(key: string): T | undefined {
    return dashboardStore.dataCache.get(key) as T;
}

/**
 * キャッシュをクリアする
 */
export function clearCache(): void {
    dashboardStore.dataCache.clear();
    dashboardStore.lastRefresh = new Date();
}

/**
 * ストア全体をリセットする（初期状態に戻す）
 */
export function resetStore(): void {
    dashboardStore.activeService = "vercel";
    dashboardStore.activeTab = "overview";
    dashboardStore.isLoading = false;
    dashboardStore.errorMessage = undefined;
    dashboardStore.authStatus = {
        vercel: "unknown",
        turso: "unknown",
        supabase: "unknown",
        github: "unknown",
    };
    dashboardStore.dataCache.clear();
    dashboardStore.lastRefresh = new Date();
}

// EOF
