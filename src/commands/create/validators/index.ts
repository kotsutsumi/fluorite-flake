/**
 * バリデーション関連モジュールを集約して再エクスポートするエントリーポイント
 */
export { validateProjectType } from "./project-type.js"; // プロジェクトタイプの検証関数を公開する
export {
    hasAuthenticationFeature,
    hasDatabaseFeature,
    isFullStackTemplate,
    isMonorepoRecommended,
    validateTemplate,
} from "./template.js"; // テンプレート関連の判定関数を公開する
export { validateDatabase, showInvalidDatabaseError } from "./database.js"; // データベース関連の検証関数を公開する

// EOF
