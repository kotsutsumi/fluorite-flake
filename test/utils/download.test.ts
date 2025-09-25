import os from 'node:os';
import path from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';
const execaMock = vi.mocked(execa);

import { cloneRepository, downloadAndExtract, downloadFile } from '../../src/utils/download.js';

describe('download utilities', () => {
    beforeEach(() => {
        execaMock.mockReset();
    });

    it('downloads and extracts archives', async () => {
        const baseDir = await mkdtemp(path.join(os.tmpdir(), 'download-test-'));
        const destination = path.join(baseDir, 'output');

        execaMock.mockResolvedValue({ stdout: '' });

        await downloadAndExtract('https://example.com/archive.tgz', destination);

        expect(execaMock).toHaveBeenNthCalledWith(
            1,
            'curl',
            [
                '-L',
                '-o',
                path.join(destination, '.temp', 'download.tar.gz'),
                'https://example.com/archive.tgz',
            ],
            expect.objectContaining({ stdio: 'pipe' })
        );
        expect(execaMock).toHaveBeenNthCalledWith(
            2,
            'tar',
            ['-xzf', path.join(destination, '.temp', 'download.tar.gz'), '-C', destination],
            expect.objectContaining({ stdio: 'pipe' })
        );

        expect(await fs.pathExists(path.join(destination, '.temp'))).toBe(false);
    });

    it('cleans up temp directory on failure', async () => {
        const baseDir = await mkdtemp(path.join(os.tmpdir(), 'download-test-'));
        const destination = path.join(baseDir, 'output');

        execaMock
            .mockResolvedValueOnce({ stdout: '' })
            .mockRejectedValueOnce(new Error('tar failed'));

        await expect(
            downloadAndExtract('https://example.com/archive.tgz', destination)
        ).rejects.toThrow('tar failed');

        expect(await fs.pathExists(path.join(destination, '.temp'))).toBe(false);
    });

    it('downloads single files via curl', async () => {
        execaMock.mockResolvedValue({ stdout: '' });
        await downloadFile('https://example.com/file.txt', '/tmp/file.txt');

        expect(execaMock).toHaveBeenCalledWith(
            'curl',
            ['-L', '-o', '/tmp/file.txt', 'https://example.com/file.txt'],
            expect.objectContaining({ stdio: 'pipe' })
        );
    });

    it('clones repositories and removes git metadata', async () => {
        const removeSpy = vi.spyOn(fs, 'remove').mockResolvedValue();
        execaMock.mockResolvedValue({ stdout: '' });

        await cloneRepository('https://github.com/foo/bar', '/tmp/bar');

        expect(execaMock).toHaveBeenCalledWith(
            'git',
            ['clone', '--depth', '1', 'https://github.com/foo/bar', '/tmp/bar'],
            expect.objectContaining({ stdio: 'pipe' })
        );
        expect(removeSpy).toHaveBeenCalledWith(path.join('/tmp/bar', '.git'));

        removeSpy.mockRestore();
    });
});
