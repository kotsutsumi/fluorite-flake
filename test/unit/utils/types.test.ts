import { describe, expect, it } from 'vitest';

import type {
    CloudProvisioningRecord,
    TursoDatabaseRecord,
} from '../../../src/utils/cloud/types.js';

describe('cloud/types definitions', () => {
    it('allows constructing a CloudProvisioningRecord with optional services', () => {
        const tursoRecord: TursoDatabaseRecord = {
            env: 'dev',
            name: 'app-dev',
            hostname: 'app-dev.turso.io',
            databaseUrl: 'libsql://app-dev.turso.io',
            authToken: 'token',
        };

        const record: CloudProvisioningRecord = {
            mode: 'mock',
            createdAt: new Date().toISOString(),
            projectName: 'Demo',
            turso: {
                organization: 'org',
                group: 'default',
                databases: [tursoRecord],
            },
        };

        expect(record.mode).toBe('mock');
        expect(record.turso?.databases[0].name).toBe('app-dev');
    });
});
