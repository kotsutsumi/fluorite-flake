/**
 * データベースジェネレーター関数のエクスポート
 * 各データベース設定機能を統合して提供する
 */

// メイン設定関数
export { setupDatabase } from './setupDatabase.js';

// ユーティリティ関数
export { addPostInstallScript } from './addPostInstallScript.js';
export { createInitScript } from './createInitScript.js';
export { createDevelopmentBootstrapScript } from './createDevelopmentBootstrapScript.js';
