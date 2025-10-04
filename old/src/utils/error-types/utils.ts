/**
 * エラーユーティリティ関数
 *
 * エラー処理とメッセージ抽出のためのユーティリティ関数群
 */

import { isErrorWithMessage } from './guards.js';
import type { ErrorWithMessage } from './types.js';

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
