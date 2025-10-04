/**
 * マルチサービスダッシュボードコマンドモジュール
 *
 * 複数のクラウドサービスをサポートする統一ダッシュボードコマンドを
 * 統合的に提供します。各機能は個別のモジュールに分離されており、
 * 保守性とテスタビリティを確保しています。
 *
 * @module multi-dashboard
 */

// 単一サービスダッシュボード起動機能
export { launchServiceDashboard } from './launchServiceDashboard.js';

// マルチサービスダッシュボード起動機能
export { launchMultiServiceDashboard } from './launchMultiServiceDashboard.js';

// サービス状態表示機能
export { showServiceStatus } from './showServiceStatus.js';

// サイドカーモード起動機能
export { launchSidecarMode } from './launchSidecarMode.js';

// 共通型定義とユーティリティ
export * from './types.js';
export * from './helpers.js';
