/**
 * エラーハンドリングユーティリティ (`error-types`) が未知の値から安全にメッセージを抽出・判定できるかを検証するユニットテスト。
 * エラー種別の識別とメッセージ正規化をカバーし、CLI の例外処理で意図したレスポンスが得られることを確認する。
 */
import { describe, expect, it } from 'vitest';

import {
    getErrorMessage,
    isAuthError,
    isDatabaseError,
    isErrorWithMessage,
    toErrorWithMessage,
} from '../../../src/utils/error-types.js';

// エラー判定・変換ユーティリティを個別に検証するテストスイート
describe('error-types utilities', () => {
    // message プロパティの有無でエラーオブジェクトかどうか判定できることを確認する
    it('detects error objects with message', () => {
        expect(isErrorWithMessage({ message: 'hi' })).toBe(true);
        expect(isErrorWithMessage('nope')).toBe(false);
    });

    // DB エラー判定がコード付きオブジェクトに対して true を返すことを検証する
    it('detects database errors', () => {
        expect(isDatabaseError({ message: 'db', code: 'SQLITE' })).toBe(true);
        expect(isDatabaseError({ message: 'db' })).toBe(false);
    });

    // 認証エラーコードの判定が期待どおり機能することを確認する
    it('detects auth errors by code', () => {
        expect(isAuthError({ message: 'no', code: 'UNAUTHORIZED' })).toBe(true);
        expect(isAuthError({ message: 'no', code: 'SOMETHING_ELSE' })).toBe(false);
    });

    // getErrorMessage が未知の入力からも安全な文字列を返すことを検証する
    it('extracts error messages safely', () => {
        expect(getErrorMessage({ message: 'fail' })).toBe('fail');
        expect(getErrorMessage('literal')).toBe('literal');
        expect(getErrorMessage(42)).toBe('An unknown error occurred');
    });

    // toErrorWithMessage が不定形データを ErrorWithMessage へ変換できることを確認する
    it('converts unknown values to ErrorWithMessage', () => {
        const result = toErrorWithMessage('oops');
        expect(result).toHaveProperty('message', 'oops');
        expect(toErrorWithMessage(new Error('boom')).message).toBe('boom');
    });
});
