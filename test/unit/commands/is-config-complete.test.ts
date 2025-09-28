import { describe, expect, it } from 'vitest';

import { isConfigComplete } from '../../../src/commands/create/is-config-complete.js';
import type { ProjectConfig } from '../../../src/commands/create/types.js';

const baseConfig: ProjectConfig = {
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
};

describe('isConfigComplete', () => {
    it('returns true when all required fields are present', () => {
        const result = isConfigComplete(baseConfig);
        expect(result).toBe(true);
    });

    it('returns false when a required field is missing', () => {
        const { packageManager, ...partialConfig } = baseConfig;
        const result = isConfigComplete(partialConfig);
        expect(result).toBe(false);
    });

    it('treats explicitly provided falsy values as complete', () => {
        const result = isConfigComplete({
            ...baseConfig,
            deployment: false,
            auth: false,
        });
        expect(result).toBe(true);
    });
});
