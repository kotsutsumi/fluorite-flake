import { describe, expect, it } from 'vitest';

import type { ProjectConfig } from '../../../src/commands/create/types.js';
import { MockProvisioner } from '../../../src/utils/cloud/mock-provisioner.js';

const baseConfig: ProjectConfig = {
    projectName: 'Sample App',
    projectPath: '/tmp/sample',
    framework: 'nextjs',
    database: 'none',
    deployment: false,
    storage: 'none',
    auth: false,
    packageManager: 'pnpm',
};

describe('MockProvisioner', () => {
    it('provisions turso databases with three environments', async () => {
        const provisioner = new MockProvisioner();
        const record = await provisioner.provision({
            ...baseConfig,
            database: 'turso',
        });

        expect(record.mode).toBe('mock');
        expect(record.turso?.databases).toHaveLength(3);
        const envs = record.turso?.databases.map((db) => db.env);
        expect(envs).toEqual(expect.arrayContaining(['dev', 'stg', 'prod']));
    });

    it('provisions storage metadata based on selection', async () => {
        const provisioner = new MockProvisioner();
        const awsRecord = await provisioner.provision({
            ...baseConfig,
            storage: 'aws-s3',
        });
        expect(awsRecord.awsS3?.bucketName).toMatch(/sample-app-s3-bucket/);

        const blobRecord = await provisioner.provision({
            ...baseConfig,
            storage: 'vercel-blob',
        });
        expect(blobRecord.vercelBlob?.readWriteToken).toMatch(/^mock-blob-token-/);
    });
});
