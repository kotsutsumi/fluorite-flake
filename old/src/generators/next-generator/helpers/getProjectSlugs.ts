/**
 * プロジェクト名からスラッグ（識別子）を生成するヘルパー関数
 * データベーステーブル名やディレクトリ名などで使用される
 */

import { toKebab } from './toKebab.js';

/**
 * プロジェクト名から各種スラッグ（識別子）を生成する
 * @param name プロジェクト名
 * @returns ケバブケースとアンダースコア形式のスラッグオブジェクト
 */
export function getProjectSlugs(name: string) {
    const kebab = toKebab(name);
    return {
        kebab,
        underscore: kebab.replace(/-/g, '_'),
    };
}
