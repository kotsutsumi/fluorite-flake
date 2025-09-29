/**
 * `version-groups` モジュールが提供するパッケージバージョングループの完全性を検証するユニットテスト。
 * コアフレームワークと関連ツールの固定バージョンが期待どおり定義されているかを確認し、
 * テンプレート世代時に参照する依存関係の更新漏れを検知することを目的としている。
 */
import { describe, expect, it } from 'vitest';

import {
    CORE_FRAMEWORK_VERSIONS,
    DATABASE_AND_ORM_VERSIONS,
    DEV_TOOL_VERSIONS,
} from '../../../src/config/package-versions/version-groups/index.js';

describe('version groups', () => {
    // Next.js などの主要フレームワークが所定のバージョンで定義されていることを確認する
    it('defines core framework versions', () => {
        expect(CORE_FRAMEWORK_VERSIONS.next).toBe('15.5.4');
        expect(CORE_FRAMEWORK_VERSIONS['@tauri-apps/api']).toBeDefined();
    });

    // データベース関連および開発ツール群のバージョンキーが揃っているかを検証する
    it('defines database and dev tool versions', () => {
        expect(DATABASE_AND_ORM_VERSIONS.prisma).toBeDefined();
        expect(DEV_TOOL_VERSIONS.vite).toBeDefined();
    });
});
