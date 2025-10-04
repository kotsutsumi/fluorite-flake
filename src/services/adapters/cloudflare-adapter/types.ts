/**
 * Cloudflareサービスアダプター型定義
 *
 * Cloudflareプラットフォーム固有のインターフェース定義
 */

import type { ServiceConfig } from '../../base-service-adapter/index.js';

/**
 * Cloudflare設定
 */
export interface CloudflareConfig extends ServiceConfig {
    /** CloudflareアカウントID */
    accountId?: string;
    /** デフォルト環境 */
    environment?: string;
}
