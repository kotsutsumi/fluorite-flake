/**
 * プロジェクトタイプ関連のバリデーション関数をまとめたモジュール
 */
import { PROJECT_TEMPLATES } from "../constants.js"; // 利用可能なプロジェクトテンプレート一覧を読み込む
import type { ProjectType } from "../types.js"; // プロジェクトタイプの型定義を取り込む

/**
 * 指定された文字列が有効なプロジェクトタイプかどうかを判定する
 */
export function validateProjectType(type: string): type is ProjectType {
    return type in PROJECT_TEMPLATES; // テンプレート定義に存在するかを確認して結果を返す
}

// EOF
