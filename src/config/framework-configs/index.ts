/**
 * フレームワーク設定モジュール
 * フレームワーク、データベース、ストレージ設定とヘルパー関数をエクスポート
 */

// 設定データのエクスポート
export { FRAMEWORK_CONFIGS } from './frameworks.js'; // フレームワーク設定マップ
export { DATABASE_CONFIGS } from './database-configs.js'; // データベース設定マップ
export { STORAGE_CONFIGS } from './storage-configs.js'; // ストレージ設定マップ

// ヘルパー関数のエクスポート
export {
    getFrameworkConfig, // フレームワーク設定取得
    getSupportedDatabases, // サポート対象データベース取得
    getSupportedStorage, // サポート対象ストレージ取得
    supportsFeature, // 機能サポートチェック
    validateConfiguration, // 設定組み合わせ検証
} from './helpers/index.js';

// 型定義のエクスポート
export type {
    FrameworkType, // フレームワーク種類
    DatabaseType, // データベース種類
    OrmType, // ORM種類
    StorageType, // ストレージ種類
    PackageManagerType, // パッケージマネージャー種類
    FrameworkFeatures, // フレームワーク機能定義
    FrameworkVersions, // フレームワークバージョン定義
    FrameworkConfig, // フレームワーク設定
} from './types.js';
