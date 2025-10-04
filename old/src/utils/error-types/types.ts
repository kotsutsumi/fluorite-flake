/**
 * エラー型定義
 *
 * エラーハンドリングのための型安全性を強化するエラー型インターフェース定義
 */

/**
 * メッセージを持つ基本的なエラーインターフェース
 */
export interface ErrorWithMessage {
    /** エラーメッセージ */
    message: string;
    /** エラーコード（オプション） */
    code?: string;
    /** スタックトレース（オプション） */
    stack?: string;
}

/**
 * データベース関連のエラーインターフェース
 */
export interface DatabaseError extends ErrorWithMessage {
    /** データベースエラーコード */
    code: string;
    /** 制約名（制約違反エラーの場合） */
    constraint?: string;
    /** テーブル名（エラーが発生したテーブル） */
    table?: string;
}

/**
 * バリデーションエラーインターフェース
 */
export interface ValidationError extends ErrorWithMessage {
    /** エラーが発生したフィールド名 */
    field?: string;
    /** エラーの原因となった値 */
    value?: unknown;
}

/**
 * 認証関連のエラーインターフェース
 */
export interface AuthError extends ErrorWithMessage {
    /** 認証エラーの種類 */
    code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_SESSION' | 'INVALID_CREDENTIALS';
    /** HTTPステータスコード */
    statusCode?: number;
}

/**
 * ネットワーク関連のエラーインターフェース
 */
export interface NetworkError extends ErrorWithMessage {
    /** リクエスト先のURL */
    url?: string;
    /** HTTPステータスコード */
    statusCode?: number;
    /** レスポンス内容 */
    response?: string;
}
