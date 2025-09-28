import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('execa', () => ({ execa: vi.fn() }));

import { execa } from 'execa';
const execaMock = vi.mocked(execa);

import { ProvisioningError } from '../../../src/utils/cloud/errors.js';
import { RealProvisioner } from '../../../src/utils/cloud/real-provisioner.js';

const originalEnv = { ...process.env };

function setRequiredEnv() {
    process.env.TURSO_API_TOKEN = 'token';
    process.env.TURSO_ORG_SLUG = 'org';
    process.env.VERCEL_TOKEN = 'vercel';
}

describe('RealProvisioner', () => {
    beforeEach(() => {
        process.env = { ...originalEnv };
        execaMock.mockReset();
    });

    it('throws when required environment variables are missing', () => {
        process.env.TURSO_API_TOKEN = '';
        process.env.TURSO_ORG_SLUG = '';
        process.env.VERCEL_TOKEN = '';

        expect(() => new RealProvisioner()).toThrow(ProvisioningError);
    });

    it('verifies Vercel CLI before provisioning', async () => {
        setRequiredEnv();
        execaMock.mockResolvedValue({ stdout: 'vercel/99.0.0' });
        const provisioner = new RealProvisioner();
        const ensureCli = (provisioner as unknown as Record<string, unknown>)
            .ensureVercelCli as () => Promise<void>;

        await expect(ensureCli()).resolves.toBeUndefined();
        expect(execaMock).toHaveBeenCalledWith('vercel', ['--version']);
    });

    it('wraps Vercel CLI errors in ProvisioningError', async () => {
        setRequiredEnv();
        execaMock.mockRejectedValue(new Error('not found'));
        const provisioner = new RealProvisioner();
        const ensureCli = (provisioner as unknown as Record<string, unknown>)
            .ensureVercelCli as () => Promise<void>;

        await expect(ensureCli()).rejects.toBeInstanceOf(ProvisioningError);
    });
});
