/**
 * 文字列を URL スラッグへ変換する `slugify` ユーティリティの正規化ルールを検証するユニットテスト。
 * 大文字・空白・ハイフン・アンダースコアなどを含む入力が期待どおりのスラッグへ変換されるかを確認する。
 */
import { describe, expect, it } from 'vitest';

import { slugify } from '../../../src/utils/slugify.js';

// スラッグ生成の代表パターンを検証するテスト
describe('slugify', () => {
    // 空白や特殊文字を含む入力が小文字ハイフン区切りへ統一されることを確認する
    it('normalizes strings into url-friendly slugs', () => {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('  Hello---World  ')).toBe('hello-world');
        expect(slugify('FOO_bar Baz')).toBe('foo-bar-baz');
    });
});
