/**
 * `.env` ファイルへの追記・更新を行う `upsertEnvFile` の挙動を検証するユニットテスト。
 * 既存キーの上書き、複数行値のクォート、空値設定による削除相当の動作などをテンポラリ環境で確認する。
 */
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { upsertEnvFile } from '../../../src/utils/env-file.js';

// 環境変数ファイルの更新ロジックを検証するテストスイート
describe('upsertEnvFile', () => {
    // 既存値の上書きや複数行値のクォート、空文字設定が期待どおり反映されることを確認する
    it('adds and replaces environment variables with quoting', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'envfile-test-'));
        const envPath = path.join(dir, '.env');
        await writeFile(envPath, 'EXISTING=value\nSHOULD_REMOVE=old\n');

        await upsertEnvFile(dir, '.env', {
            EXISTING: 'new-value',
            MULTILINE: 'line1\nline2',
            SIMPLE: 'ok',
            SHOULD_REMOVE: '',
        });

        const contents = await readFile(envPath, 'utf-8');
        expect(contents).toContain('EXISTING=new-value');
        expect(contents).toContain('MULTILINE="line1\nline2"');
        expect(contents).toContain('SIMPLE=ok');
        expect(contents).toContain('SHOULD_REMOVE=');
        expect(contents).not.toContain('SHOULD_REMOVE=old');
    });

    // 更新内容が空の場合にファイル生成をスキップし、結果が空文字列となることを検証する
    it('returns early when no updates provided', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'envfile-test-'));
        await upsertEnvFile(dir, '.env', {});
        const contents = await readFile(path.join(dir, '.env'), 'utf-8').catch(() => '');
        expect(contents).toBe('');
    });
});
