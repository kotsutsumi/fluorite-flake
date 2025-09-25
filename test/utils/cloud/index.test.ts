import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import {
    PROVISIONING_FILENAME,
    isProvisioningEligible,
    provisionCloudResources,
} from '../../../src/utils/cloud/index.js';
import { MockProvisioner } from '../../../src/utils/cloud/mock-provisioner.js';
import type { CloudProvisioningRecord } from '../../../src/utils/cloud/types.js';

const baseConfig: ProjectConfig = {
    projectName: 'My Next App',
    projectPath: '', // filled per-test
    framework: 'nextjs',
    database: 'turso',
    deployment: true,
    storage: 'vercel-blob',
    auth: true,
    packageManager: 'pnpm',
    mode: 'full',
};

describe('cloud/index utilities', () => {
    it('evaluates provisioning eligibility correctly', () => {
        expect(
            isProvisioningEligible({
                ...baseConfig,
                projectPath: '/tmp/eligible',
                database: 'turso',
            })
        ).toBe(true);

        expect(
            isProvisioningEligible({
                ...baseConfig,
                projectPath: '/tmp/none',
                database: 'none',
                storage: 'none',
                deployment: false,
            })
        ).toBe(false);

        expect(
            isProvisioningEligible({
                ...baseConfig,
                projectPath: '/tmp/storage',
                database: 'none',
                storage: 'vercel-blob',
                deployment: false,
            })
        ).toBe(true);
    });

    it('skips provisioning when not eligible', async () => {
        const result = await provisionCloudResources({
            ...baseConfig,
            projectPath: '/tmp/skip',
            database: 'none',
            storage: 'none',
            deployment: false,
        });

        expect(result).toBeNull();
    });

    it('writes provisioning record and env files when eligible', async () => {
        const tempDir = await mkdtemp(path.join(os.tmpdir(), 'cloud-test-'));
        const config = { ...baseConfig, projectPath: tempDir };

        const record: CloudProvisioningRecord = {
            mode: 'mock',
            createdAt: new Date().toISOString(),
            projectName: config.projectName,
            turso: {
                organization: 'mock-org',
                group: 'default',
                databases: [
                    {
                        env: 'dev',
                        name: 'my-next-app-dev',
                        hostname: 'dev.turso.io',
                        databaseUrl: 'libsql://dev.turso.io',
                        authToken: 'dev-token',
                    },
                    {
                        env: 'stg',
                        name: 'my-next-app-stg',
                        hostname: 'stg.turso.io',
                        databaseUrl: 'libsql://stg.turso.io',
                        authToken: 'stg-token',
                    },
                    {
                        env: 'prod',
                        name: 'my-next-app-prod',
                        hostname: 'prod.turso.io',
                        databaseUrl: 'libsql://prod.turso.io',
                        authToken: 'prod-token',
                    },
                ],
            },
            vercel: {
                projectId: 'proj_123',
                projectName: config.projectName,
                productionUrl: 'https://example.vercel.app',
            },
            vercelBlob: {
                storeId: 'store',
                storeName: 'store',
                readWriteToken: 'blob_token',
            },
        };

        const provisionSpy = vi
            .spyOn(MockProvisioner.prototype, 'provision')
            .mockResolvedValue(record);

        const result = await provisionCloudResources(config);

        expect(result).toEqual(record);
        expect(provisionSpy).toHaveBeenCalled();

        const provisioningFile = path.join(tempDir, PROVISIONING_FILENAME);
        expect(await fs.pathExists(provisioningFile)).toBe(true);

        const fileContents = await fs.readJSON(provisioningFile);
        expect(fileContents).toMatchObject({ projectName: config.projectName, mode: 'mock' });

        const envLocal = await readFile(path.join(tempDir, '.env.local'), 'utf-8');
        expect(envLocal).toContain('DATABASE_URL=libsql://dev.turso.io?authToken=dev-token');
        expect(envLocal).toContain('BLOB_READ_WRITE_TOKEN=blob_token');

        provisionSpy.mockRestore();
    });
});
