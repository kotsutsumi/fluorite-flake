/**
 * テンプレートに関する判定とバリデーションを提供するモジュール
 */
import { PROJECT_TEMPLATES } from "../constants.js"; // プロジェクトタイプごとのテンプレート一覧を読み込む
import type { ProjectType } from "../types.js"; // プロジェクトタイプの型定義を取り込む

/**
 * 指定したテンプレートがプロジェクトタイプに対して有効か判定する
 */
export function validateTemplate(type: ProjectType, template: string): boolean {
    return (PROJECT_TEMPLATES[type] as readonly string[]).includes(template); // 対応テンプレートの配列に含まれるかを確認する
}

/**
 * フルスタック系テンプレートかどうかを判定する
 */
export function isFullStackTemplate(template: string): boolean {
    return template.includes("fullstack") || template.includes("admin"); // fullstackまたはadminを含むテンプレートをフルスタック扱いとする
}

/**
 * 認証機能を含むテンプレートかどうかを判定する
 */
export function hasAuthenticationFeature(template: string): boolean {
    return template.includes("admin") || template.includes("fullstack"); // adminまたはfullstackを含むテンプレートが認証対応
}

/**
 * データベース統合を含むテンプレートかどうかを判定する
 */
export function hasDatabaseFeature(template: string): boolean {
    return template.includes("admin") || template.includes("fullstack"); // adminまたはfullstackを含むテンプレートがDB統合対応
}

/**
 * モノレポ構造を推奨するテンプレートかどうかを判定する
 */
export function isMonorepoRecommended(template: string): boolean {
    return template.includes("fullstack") || template.includes("cross-platform") || template.includes("desktop-admin"); // フルスタック系やクロスプラットフォーム系テンプレートはモノレポ推奨とする
}

// EOF
