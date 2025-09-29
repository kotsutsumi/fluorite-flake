/**
 * 文字列をケバブケース（ハイフン区切り）に変換するヘルパー関数
 * プロジェクト名やディレクトリ名を正規化する際に使用される
 */

import { slugify } from '../../../utils/slugify.js';

/**
 * 文字列をケバブケース（ハイフン区切り）に変換する
 * @param value 変換する文字列
 * @returns ケバブケース文字列、空の場合は'app'を返す
 */
export function toKebab(value: string): string {
    return slugify(value) || 'app';
}
