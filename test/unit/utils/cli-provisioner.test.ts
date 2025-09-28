import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';
const execaMock = vi.mocked(execa);
import { CLIProvisioner } from '../../../src/utils/cloud/cli-provisioner.js';
import { ProvisioningError } from '../../../src/utils/cloud/errors.js';

function getPrivateMethod<T extends object, K extends keyof T>(instance: T, key: K): T[K] {
    return (instance as unknown as Record<string, unknown>)[key] as T[K];
}

describe('CLIProvisioner', () => {
    beforeEach(() => {
        execaMock.mockReset();
    });

    it('identifies unsupported blob subcommand errors', () => {
        const provisioner = new CLIProvisioner();
        const detector = getPrivateMethod(provisioner, 'isUnsupportedBlobSubcommand') as (
            input?: string
        ) => boolean;

        expect(detector('Unknown command')).toBe(true);
        expect(detector('please specify a valid subcommand')).toBe(true);
        expect(detector('All good')).toBe(false);
        expect(detector()).toBe(false);
    });

    it('falls back to alternate blob commands and returns token', async () => {
        const provisioner = new CLIProvisioner();
        const createAndConnect = getPrivateMethod(provisioner, 'createAndConnectBlobStore') as (
            storeName: string,
            projectPath: string
        ) => Promise<string | undefined>;

        execaMock
            .mockRejectedValueOnce({ stderr: 'unknown command blob store add' })
            .mockResolvedValueOnce({ stdout: '' })
            .mockResolvedValueOnce({ stdout: 'Created BLOB_READ_WRITE_TOKEN=blob_token-xyz' });

        const token = await createAndConnect.call(provisioner, 'demo-store', '/tmp/project');

        expect(token).toBe('blob_token-xyz');
        expect(execaMock).toHaveBeenCalledTimes(3);
        expect(execaMock.mock.calls[0][1]).toEqual(['blob', 'store', 'add', 'demo-store']);
        expect(execaMock.mock.calls[1][1]).toEqual(['blob', 'store', 'create', 'demo-store']);
        expect(execaMock.mock.calls[2][1]).toContain('connect');
    });

    it('throws when blob store cannot be created', async () => {
        const provisioner = new CLIProvisioner();
        const createAndConnect = getPrivateMethod(provisioner, 'createAndConnectBlobStore') as (
            storeName: string,
            projectPath: string
        ) => Promise<string | undefined>;

        execaMock
            .mockRejectedValueOnce({ stderr: 'unknown command add' })
            .mockRejectedValueOnce({ stderr: 'unknown argument store' });

        await expect(
            createAndConnect.call(provisioner, 'demo-store', '/tmp/project')
        ).rejects.toBeInstanceOf(ProvisioningError);
    });
    it('parses blob store list JSON responses', () => {
        const provisioner = new CLIProvisioner();
        const parser = getPrivateMethod(provisioner, 'parseBlobStoreList') as (
            output: string
        ) => string[];

        const stores = parser.call(
            provisioner,
            '[{"slug":"demo-store","id":"store_123"},{"name":"another-store"}]'
        );

        expect(stores).toEqual(['demo-store', 'another-store']);
    });

    it.skip('parses blob store list table output', () => {
        const provisioner = new CLIProvisioner();
        const parser = getPrivateMethod(provisioner, 'parseBlobStoreList') as (
            output: string
        ) => string[];

        const tableOutput = [
            '┌────────────┬────────────┐',
            '│ Name       │ ID         │',
            '├────────────┼────────────┤',
            '│ my-store   │ store_123  │',
            '└────────────┴────────────┘',
        ].join('\n');

        expect(parser.call(provisioner, tableOutput)).toEqual(['my-store']);
    });

    it.skip('lists blob stores with fallback commands', async () => {
        const provisioner = new CLIProvisioner();
        const lister = getPrivateMethod(provisioner, 'listBlobStores') as (
            projectPath: string
        ) => Promise<string[]>;

        execaMock
            .mockResolvedValueOnce({
                stdout: '',
                stderr: 'Unknown option "--json"',
                exitCode: 1,
                // biome-ignore lint/suspicious/noExplicitAny: mock type compatibility
            } as any)
            .mockResolvedValueOnce({
                stdout: '[{"name":"existing-store"}]',
                stderr: '',
                exitCode: 0,
                // biome-ignore lint/suspicious/noExplicitAny: mock type compatibility
            } as any);

        const stores = await lister.call(provisioner, '/tmp/project');

        expect(stores).toEqual(['existing-store']);
        expect(execaMock).toHaveBeenNthCalledWith(
            1,
            'vercel',
            ['blob', 'store', 'list', '--json'],
            expect.objectContaining({ cwd: '/tmp/project', reject: false, timeout: 15000 })
        );
        expect(execaMock).toHaveBeenNthCalledWith(
            2,
            'vercel',
            ['blob', 'store', 'ls', '--json'],
            expect.objectContaining({ cwd: '/tmp/project', reject: false, timeout: 15000 })
        );
    });
});
