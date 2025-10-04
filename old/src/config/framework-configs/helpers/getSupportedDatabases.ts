/**
 * フレームワーク対応データベース取得関数
 */

import { FRAMEWORK_CONFIGS } from '../frameworks.js';
import type { DatabaseType, FrameworkType } from '../types.js';

/**
 * フレームワークがサポートするデータベース一覧を取得
 * @param framework - 対象フレームワーク
 * @returns サポートされているデータベースの配列
 */
export function getSupportedDatabases(framework: FrameworkType): DatabaseType[] {
    return FRAMEWORK_CONFIGS[framework].supportedDatabases;
}
