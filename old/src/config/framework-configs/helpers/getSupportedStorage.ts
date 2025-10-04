/**
 * フレームワーク対応ストレージ取得関数
 */

import { FRAMEWORK_CONFIGS } from '../frameworks.js';
import type { FrameworkType, StorageType } from '../types.js';

/**
 * フレームワークがサポートするストレージサービス一覧を取得
 * @param framework - 対象フレームワーク
 * @returns サポートされているストレージサービスの配列
 */
export function getSupportedStorage(framework: FrameworkType): StorageType[] {
    return FRAMEWORK_CONFIGS[framework].supportedStorage;
}
