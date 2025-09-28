import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';

const originalAutoProvision = process.env.FLUORITE_AUTO_PROVISION;
const originalCloudMode = process.env.FLUORITE_CLOUD_MODE;
const originalNodeEnv = process.env.NODE_ENV;

const cleanupPaths: string[] = [];

async function importCloudModule() {
    return await import('../../../src/utils/cloud/index.js');
}

function restoreEnv() {
    if (originalAutoProvision === undefined) {
        // biome-ignore lint/performance/noDelete: Need to actually delete env var for tests
        delete process.env.FLUORITE_AUTO_PROVISION;
    } else {
        process.env.FLUORITE_AUTO_PROVISION = originalAutoProvision;
    }

    if (originalCloudMode === undefined) {
        // biome-ignore lint/performance/noDelete: Need to actually delete env var for tests
        delete process.env.FLUORITE_CLOUD_MODE;
    } else {
        process.env.FLUORITE_CLOUD_MODE = originalCloudMode;
    }

    if (originalNodeEnv === undefined) {
        // biome-ignore lint/performance/noDelete: Need to actually delete env var for tests
        delete process.env.NODE_ENV;
    } else {
        process.env.NODE_ENV = originalNodeEnv;
    }
}

function createConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
    return {
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
        ...overrides,
    } as ProjectConfig;
}

async function createProvisioningProject(overrides: Partial<ProjectConfig> = {}) {
    const projectPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ff-cloud-'));
    cleanupPaths.push(projectPath);

    // Create empty .env files that the cloud provisioning expects
    await fs.writeFile(path.join(projectPath, '.env.local'), '');
    await fs.writeFile(path.join(projectPath, '.env.production'), '');

    return createConfig({ projectPath, ...overrides });
}

afterEach(async () => {
    restoreEnv();
    await Promise.all(cleanupPaths.map((dir) => fs.remove(dir)));
    cleanupPaths.length = 0;
});

describe('isProvisioningEligible', () => {
    it('requires auto provisioning to be enabled and a Next.js project with managed services', async () => {
        vi.resetModules();
        // biome-ignore lint/performance/noDelete: Need to actually delete env var for tests
        delete process.env.FLUORITE_AUTO_PROVISION;
        process.env.NODE_ENV = 'test';

        const { isProvisioningEligible } = await importCloudModule();

        expect(
            isProvisioningEligible(
                createConfig({
                    framework: 'expo',
                    database: 'none',
                    storage: 'none',
                    deployment: false,
                })
            )
        ).toBe(false);

        expect(
            isProvisioningEligible(
                createConfig({
                    framework: 'nextjs',
                    database: 'turso',
                    storage: 'none',
                    deployment: false,
                })
            )
        ).toBe(true);
    });

    it('returns false when auto provisioning is disabled via environment variable', async () => {
        vi.resetModules();
        process.env.FLUORITE_AUTO_PROVISION = 'false';
        process.env.NODE_ENV = 'test';

        const { isProvisioningEligible } = await importCloudModule();
        expect(isProvisioningEligible(createConfig())).toBe(false);
    });
});

describe('provisionCloudResources', () => {
    it('uses the mock provisioner in tests and writes provisioning artifacts', async () => {
        vi.resetModules();
        // biome-ignore lint/performance/noDelete: Need to actually delete env var for tests
        delete process.env.FLUORITE_AUTO_PROVISION;
        process.env.FLUORITE_CLOUD_MODE = 'mock';
        process.env.NODE_ENV = 'test';

        const { provisionCloudResources, PROVISIONING_FILENAME } = await importCloudModule();
        const config = await createProvisioningProject({
            database: 'turso',
            storage: 'vercel-blob',
            deployment: true,
        });

        const record = await provisionCloudResources(config);
        expect(record).not.toBeNull();
        expect(record?.mode).toBe('mock');

        const provisioningPath = path.join(config.projectPath, PROVISIONING_FILENAME);
        expect(await fs.pathExists(provisioningPath)).toBe(true);

        const envLocal = await fs.readFile(path.join(config.projectPath, '.env.local'), 'utf-8');
        const envProduction = await fs.readFile(
            path.join(config.projectPath, '.env.production'),
            'utf-8'
        );

        expect(envLocal).toContain('DATABASE_URL');
        expect(envLocal).toContain('BLOB_READ_WRITE_TOKEN');
        expect(envProduction).toContain('DATABASE_URL');
        expect(envProduction).toContain('BLOB_READ_WRITE_TOKEN');
    });
});
