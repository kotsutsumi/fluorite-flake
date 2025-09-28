/**
 * パッケージバージョン取得ヘルパー (`getPackageVersion`, `getPackageVersions`) の挙動を確認するテスト。
 * 既知パッケージの固定バージョン、未知パッケージのフォールバック、複数取得時のマップ生成を検証する。
 */
import { describe, expect, it } from 'vitest';

import {
    getPackageVersion,
    getPackageVersions,
} from '../../../src/config/package-versions/helpers.js';

describe('パッケージバージョン取得ヘルパー', () => {
    it('既知パッケージでは固定バージョンを返すこと', () => {
        expect(getPackageVersion('react')).toBe('19.0.0');
    });

    it('未知パッケージでは latest にフォールバックすること', () => {
        expect(getPackageVersion('totally-made-up-package')).toBe('latest');
    });

    it('複数パッケージ指定時にバージョンマップを構築できること', () => {
        const versions = getPackageVersions(['next', 'react']);
        expect(versions).toEqual({
            next: '15.5.4',
            react: '19.0.0',
        });
    });
});
