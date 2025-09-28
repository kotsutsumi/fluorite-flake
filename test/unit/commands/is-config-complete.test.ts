/**
 * `isConfigComplete` の挙動を検証するユニットテスト。
 * CLI 生成フローで使用する設定オブジェクトが、必須項目を全て満たしているかどうかを
 * 判定できるかをハッピーパス／欠損ケース／falsy 値の明示指定という観点で確認する。
 */
import { describe, expect, it } from 'vitest';

import { isConfigComplete } from '../../../src/commands/create/is-config-complete.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

// テスト全体で使い回す基準となる設定オブジェクト
const baseConfig: ProjectConfig = {
    projectName: 'demo-app',
    projectPath: '/tmp/demo-app',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
    mode: 'full',
};

describe('isConfigComplete の判定ロジック', () => {
    it('全ての必須フィールドが揃っている場合に true を返すこと', () => {
        const result = isConfigComplete(baseConfig);
        expect(result).toBe(true);
    });

    it('必須フィールドが欠けている場合に false を返すこと', () => {
        const { packageManager, ...partialConfig } = baseConfig;
        const result = isConfigComplete(partialConfig);
        expect(result).toBe(false);
    });

    it('false 指定でも明示されていれば欠損とみなさないこと', () => {
        const result = isConfigComplete({
            ...baseConfig,
            deployment: false,
            auth: false,
        });
        expect(result).toBe(true);
    });
});
