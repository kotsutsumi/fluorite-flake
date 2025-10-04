import { capitalize } from './string-utils.js';
import { t } from './translate.js';
import type { MessageKey } from './types.js';

/**
 * 無効なオプション値のエラーメッセージをフォーマットする
 * @param type - オプションのタイプ
 * @param value - 無効な値
 * @returns フォーマットされたエラーメッセージ
 */
export function formatInvalidOption(
    type: 'framework' | 'database' | 'orm' | 'storage' | 'packageManager' | 'mode',
    value: string
): string {
    // タイプ名を大文字で始めてメッセージキーを構築
    const key = `create.invalid${capitalize(type)}` as MessageKey;
    return t(key, { value });
}
