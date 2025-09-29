/**
 * パッケージバージョン管理モジュール
 * パッケージバージョン、カテゴリ、ヘルパー関数を統合エクスポート
 */

// パッケージバージョンデータのエクスポート
export { PACKAGE_VERSIONS } from './package-versions.js'; // 統合パッケージバージョンマップ
export { PACKAGE_CATEGORIES } from './categories.js'; // パッケージカテゴリ定義

// ヘルパー関数のエクスポート
export { getPackageVersion, getPackageVersions } from './helpers.js'; // バージョン取得ユーティリティ
