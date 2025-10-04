/**
 * `getAuthText` がフレームワーク種別ごとに適切な認証ソリューション名を案内できるかを確認するテスト。
 * Next.js / Expo で想定どおりの文言が返るか、未対応フレームワークではデフォルト値にフォールバックするかを検証する。
 */
import { describe, expect, it } from 'vitest';

import { getAuthText } from '../../../src/commands/create/get-auth-text.js';

describe('getAuthText の案内文判定', () => {
    it('Next.js では "Better Auth" が返ること', () => {
        expect(getAuthText('nextjs')).toBe('Better Auth');
    });

    it('Expo では "Expo Auth Session" が返ること', () => {
        expect(getAuthText('expo')).toBe('Expo Auth Session');
    });

    it('その他のフレームワークでは "Custom Auth" にフォールバックすること', () => {
        expect(getAuthText('unknown')).toBe('Custom Auth');
    });
});
