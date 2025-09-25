import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { upsertEnvFile } from '../../src/utils/env-file.js';

describe('upsertEnvFile', () => {
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

    it('returns early when no updates provided', async () => {
        const dir = await mkdtemp(path.join(os.tmpdir(), 'envfile-test-'));
        await upsertEnvFile(dir, '.env', {});
        const contents = await readFile(path.join(dir, '.env'), 'utf-8').catch(() => '');
        expect(contents).toBe('');
    });
});
