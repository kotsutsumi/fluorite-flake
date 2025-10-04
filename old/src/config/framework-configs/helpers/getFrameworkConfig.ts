/**
 * フレームワーク設定を取得するヘルパー関数
 */

import { FRAMEWORK_CONFIGS } from '../frameworks.js';
import type { FrameworkConfig, FrameworkType } from '../types.js';

/**
 * フレームワーク設定を取得
 * @param framework - 取得したいフレームワークの種類
 * @returns 指定されたフレームワークの設定
 */
export function getFrameworkConfig(framework: FrameworkType): FrameworkConfig {
    return FRAMEWORK_CONFIGS[framework];
}
