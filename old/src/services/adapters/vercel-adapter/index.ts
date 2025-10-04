/**
 * Vercelサービスアダプターモジュールのエクスポート
 *
 * Vercelプラットフォーム統合機能を提供する
 */

// メインアダプタークラス
export { VercelAdapter } from './VercelAdapter.js';
export { default } from './VercelAdapter.js';

// 型定義
export type {
    VercelProject,
    VercelDeployment,
    VercelDomain,
    VercelAnalytics,
    VercelFunction,
    VercelConfig,
} from './types.js';
