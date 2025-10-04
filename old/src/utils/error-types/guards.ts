/**
 * エラータイプガード
 *
 * 型安全なエラーハンドリングのための型ガード関数群
 */

import type { AuthError, DatabaseError, ErrorWithMessage } from './types.js';

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
