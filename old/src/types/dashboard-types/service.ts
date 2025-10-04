/**
 * サービスとプロセス管理関連の型定義
 */

// Import ServiceMetrics to avoid circular dependency
import type { ServiceMetrics } from '../../services/base-service-adapter/index.js';

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
