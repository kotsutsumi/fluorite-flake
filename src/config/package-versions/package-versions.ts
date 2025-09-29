/**
 * パッケージバージョン統合定義
 * 各バージョングループを統合して全パッケージバージョンを定義
 */

import {
    ANIMATION_VERSIONS, // アニメーション関連パッケージ
    AUTH_VERSIONS, // 認証関連パッケージ
    BUILD_TOOL_VERSIONS, // ビルドツール関連パッケージ
    CORE_FRAMEWORK_VERSIONS, // コアフレームワークパッケージ
    DATABASE_AND_ORM_VERSIONS, // データベースとORMパッケージ
    DEPLOYMENT_VERSIONS, // デプロイ関連パッケージ
    DEV_TOOL_VERSIONS, // 開発ツールパッケージ
    EXPO_SPECIFIC_VERSIONS, // Expo固有パッケージ
    FORM_AND_INPUT_VERSIONS, // フォームと入力関連パッケージ
    KIBO_ADDITIONAL_VERSIONS, // Kibo追加パッケージ
    KIBO_UI_VERSIONS, // Kibo UIパッケージ
    STATE_THEME_VERSIONS, // 状態管理とテーマパッケージ
    STORAGE_VERSIONS, // ストレージ関連パッケージ
    STYLING_VERSIONS, // スタイリング関連パッケージ
    TAURI_SPECIFIC_VERSIONS, // Tauri固有パッケージ
    TESTING_VERSIONS, // テスト関連パッケージ
    TYPESCRIPT_AND_TYPES_VERSIONS, // TypeScriptと型定義パッケージ
    UI_COMPONENT_VERSIONS, // UIコンポーネントパッケージ
    UI_LIBRARY_VERSIONS, // UIライブラリパッケージ
} from './version-groups.js';

/**
 * 統合パッケージバージョンマップ
 * 全てのバージョングループを統合したパッケージバージョン定義
 */
export const PACKAGE_VERSIONS = {
    ...CORE_FRAMEWORK_VERSIONS, // コアフレームワークバージョン
    ...TYPESCRIPT_AND_TYPES_VERSIONS, // TypeScriptと型定義バージョン
    ...STYLING_VERSIONS, // スタイリングバージョン
    ...DATABASE_AND_ORM_VERSIONS, // データベースとORMバージョン
    ...AUTH_VERSIONS, // 認証バージョン
    ...STORAGE_VERSIONS, // ストレージバージョン
    ...DEPLOYMENT_VERSIONS, // デプロイバージョン
    ...STATE_THEME_VERSIONS, // 状態管理とテーマバージョン
    ...UI_COMPONENT_VERSIONS, // UIコンポーネントバージョン
    ...FORM_AND_INPUT_VERSIONS, // フォームと入力バージョン
    ...UI_LIBRARY_VERSIONS, // UIライブラリバージョン
    ...ANIMATION_VERSIONS, // アニメーションバージョン
    ...KIBO_UI_VERSIONS, // Kibo UIバージョン
    ...KIBO_ADDITIONAL_VERSIONS, // Kibo追加バージョン
    ...DEV_TOOL_VERSIONS, // 開発ツールバージョン
    ...TESTING_VERSIONS, // テストバージョン
    ...BUILD_TOOL_VERSIONS, // ビルドツールバージョン
    ...EXPO_SPECIFIC_VERSIONS, // Expo固有バージョン
    ...TAURI_SPECIFIC_VERSIONS, // Tauri固有バージョン
} as const;
