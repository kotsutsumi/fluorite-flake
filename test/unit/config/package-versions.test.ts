/**
 * `PACKAGE_VERSIONS` がバージョングループで定義した依存関係一覧を正しく統合しているかを検証するユニットテスト。
 * Next.js などのコア依存とストレージ関連パッケージが欠落せずに再輸出されているかを確認し、
 * CLI のテンプレート生成時に参照されるバージョン情報が最新状態とずれないよう監視する。
 */
import { describe, expect, it } from 'vitest';

import { PACKAGE_VERSIONS } from '../../../src/config/package-versions/package-versions.js';

import {
    CORE_FRAMEWORK_VERSIONS,
    STORAGE_VERSIONS,
} from '../../../src/config/package-versions/version-groups.js';

describe('PACKAGE_VERSIONS aggregation', () => {
    // version-groups で宣言されたキーがすべて統合結果に含まれているかをチェックする
    it('includes entries from version groups', () => {
        for (const key of Object.keys(CORE_FRAMEWORK_VERSIONS)) {
            expect(PACKAGE_VERSIONS).toHaveProperty(key);
        }
        for (const key of Object.keys(STORAGE_VERSIONS)) {
            expect(PACKAGE_VERSIONS).toHaveProperty(key);
        }
    });
});
