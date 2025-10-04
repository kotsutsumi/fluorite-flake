import { initialLocaleFromEnvironment, normalizeLocale } from './locale-detection.js';
import type { SupportedLocale } from './types.js';

// 現在のアクティブなロケール（初期値は環境変数から取得）
let currentLocale: SupportedLocale = normalizeLocale(initialLocaleFromEnvironment());

/**
 * 現在のロケールを設定する
 * CLIの実行中にロケールを動的に変更可能
 * @param locale - 設定するロケール（nullの場合は環境変数から再取得）
 */
export function setLocale(locale?: string | null): void {
    currentLocale = normalizeLocale(locale ?? initialLocaleFromEnvironment());
}

/**
 * 現在のアクティブなロケールを取得する
 * @returns 現在のロケール（'en' または 'ja'）
 */
export function getLocale(): SupportedLocale {
    return currentLocale;
}
