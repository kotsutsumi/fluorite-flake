import { describe, expect, it } from 'vitest';

import { isConfigComplete } from '../../../src/commands/create/is-config-complete.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

const completeConfig: ProjectConfig = {
    projectName: 'app',
    projectPath: './app',
    framework: 'nextjs',
    database: 'turso',
    orm: 'prisma',
    deployment: true,
    storage: 'vercel-blob',
    auth: true,
    packageManager: 'pnpm',
    mode: 'full',
};

describe('isConfigComplete', () => {
    it('returns true when required fields are present', () => {
        expect(isConfigComplete(completeConfig)).toBe(true);
    });

    it('returns false when any required field is missing', () => {
        const missingDatabase: Partial<ProjectConfig> = { ...completeConfig };
        missingDatabase.database = undefined;
        expect(isConfigComplete(missingDatabase)).toBe(false);

        const missingDeployment: Partial<ProjectConfig> = { ...completeConfig };
        missingDeployment.deployment = undefined;
        expect(isConfigComplete(missingDeployment)).toBe(false);

        const missingAuth: Partial<ProjectConfig> = { ...completeConfig };
        missingAuth.auth = undefined;
        expect(isConfigComplete(missingAuth)).toBe(false);

        const missingPackageManager: Partial<ProjectConfig> = { ...completeConfig };
        missingPackageManager.packageManager = undefined;
        expect(isConfigComplete(missingPackageManager)).toBe(false);
    });

    it('returns false for empty configuration', () => {
        expect(isConfigComplete({})).toBe(false);
    });
});
