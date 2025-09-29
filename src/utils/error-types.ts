/**
 * エラーハンドリングのための型安全性を強化するエラー型定義
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

/**
 * エラーがmessageプロパティを持つかどうかをチェックする型ガード
 * @param error チェックするエラー
 * @returns ErrorWithMessage型の場合はtrue
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}

/**
 * エラーがデータベースエラーかどうかをチェックする型ガード
 * @param error チェックするエラー
 * @returns DatabaseError型の場合はtrue
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
    return (
        isErrorWithMessage(error) &&
        'code' in error &&
        typeof (error as unknown as Record<string, unknown>).code === 'string'
    );
}

/**
 * エラーが認証エラーかどうかをチェックする型ガード
 * @param error チェックするエラー
 * @returns AuthError型の場合はtrue
 */
export function isAuthError(error: unknown): error is AuthError {
    return (
        isErrorWithMessage(error) &&
        'code' in error &&
        ['UNAUTHORIZED', 'FORBIDDEN', 'INVALID_SESSION', 'INVALID_CREDENTIALS'].includes(
            (error as unknown as Record<string, unknown>).code as string
        )
    );
}

/**
 * 未知のエラーから安全にエラーメッセージを取得します
 * @param error エラーオブジェクト
 * @returns エラーメッセージ文字列
 */
export function getErrorMessage(error: unknown): string {
    // ErrorWithMessageインターフェースを満たす場合
    if (isErrorWithMessage(error)) {
        return error.message;
    }

    // 文字列の場合はそのまま返す
    if (typeof error === 'string') {
        return error;
    }

    // その他の場合はデフォルトメッセージ
    return 'An unknown error occurred';
}

/**
 * 未知のエラーをErrorWithMessage型に変換します
 * @param error 変換するエラー
 * @returns ErrorWithMessage型のエラーオブジェクト
 */
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
    // 既にErrorWithMessage型の場合はそのまま返す
    if (isErrorWithMessage(error)) {
        return error;
    }

    // 新しいErrorWithMessageオブジェクトを作成
    return {
        message: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
    };
}
