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
});
