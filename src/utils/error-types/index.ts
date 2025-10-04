/**
 * エラータイプモジュール
 *
 * エラーハンドリングのための型安全性を強化するエラー型定義、
 * 型ガード関数、およびユーティリティ関数の統一エクスポート
 */

// 型定義をエクスポート
export type {
    AuthError,
    DatabaseError,
    ErrorWithMessage,
    NetworkError,
    ValidationError,
} from './types.js';

// 型ガード関数をエクスポート
export {
    isAuthError,
    isDatabaseError,
    isErrorWithMessage,
} from './guards.js';

// ユーティリティ関数をエクスポート
export {
    getErrorMessage,
    toErrorWithMessage,
} from './utils.js';
