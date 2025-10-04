/**
 * クラウドプロビジョニング用のカスタム例外 `ProvisioningError` が Error としての基本的な性質を保持するかを確認するユニットテスト。
 * メッセージや name、cause プロパティの格納が期待どおり行われることを検証する。
 */
import { describe, expect, it } from 'vitest';

import { ProvisioningError } from '../../../src/utils/cloud/errors.js';

// ProvisioningError のインスタンス化挙動を検証するテスト
describe('ProvisioningError', () => {
    // メッセージと name がエラーインスタンスとして適切に設定されることを確認する
    it('stores message and name', () => {
        const error = new ProvisioningError('failed to provision');
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('failed to provision');
        expect(error.name).toBe('ProvisioningError');
    });

    // cause に元エラーを渡した際に保持されることを検証する
    it('preserves cause when provided', () => {
        const cause = new Error('root');
        const error = new ProvisioningError('outer', cause);
        expect(error.cause).toBe(cause);
    });
});
