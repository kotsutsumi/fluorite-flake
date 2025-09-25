import { describe, expect, it } from 'vitest';

import {
    CORE_FRAMEWORK_VERSIONS,
    DATABASE_AND_ORM_VERSIONS,
    DEV_TOOL_VERSIONS,
} from '../../../src/config/package-versions/version-groups.js';

describe('version groups', () => {
    it('defines core framework versions', () => {
        expect(CORE_FRAMEWORK_VERSIONS.next).toBe('15.5.4');
        expect(CORE_FRAMEWORK_VERSIONS['@tauri-apps/api']).toBeDefined();
    });

    it('defines database and dev tool versions', () => {
        expect(DATABASE_AND_ORM_VERSIONS.prisma).toBeDefined();
        expect(DEV_TOOL_VERSIONS.vite).toBeDefined();
    });
});
