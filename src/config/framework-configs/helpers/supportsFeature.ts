/**
 * フレームワーク機能サポートチェック関数
 */

import { FRAMEWORK_CONFIGS } from '../frameworks.js';
import type { FrameworkFeatures, FrameworkType } from '../types.js';

/**
 * フレームワークが特定の機能をサポートしているかチェック
 * @param framework - チェックしたいフレームワーク
 * @param feature - チェックしたい機能
 * @returns 機能サポートの有無
 */
export function supportsFeature(
    framework: FrameworkType,
    feature: keyof FrameworkFeatures
): boolean {
    return FRAMEWORK_CONFIGS[framework].supportedFeatures[feature];
}
