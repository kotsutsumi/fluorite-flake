/**
 * `package-versions/index` モジュールが公開する再輸出 API を検証するユニットテスト。
 * 依存関係のバージョン定数やカテゴリ分類、ユーティリティ関数がまとめて利用可能になっているかを確認し、
 * CLI から参照する際の API サーフェスが壊れていないかを監視する。
 */
import { describe, expect, it } from 'vitest';

import * as exports from '../../../src/config/package-versions/index.js';

describe('package-versions index re-exports', () => {
    // バージョン定数・カテゴリ・ヘルパー関数がインデックス経由で取得できることを検証する
    it('exposes versions, categories, and helpers', () => {
        expect(exports.PACKAGE_VERSIONS.next).toBeDefined();
        expect(exports.PACKAGE_CATEGORIES.auth).toContain('better-auth');
        expect(exports.getPackageVersion('react')).toMatch(/\d/);
    });
});
