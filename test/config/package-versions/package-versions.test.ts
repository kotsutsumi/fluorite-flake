import { describe, expect, it } from 'vitest';

import { PACKAGE_VERSIONS } from '../../../src/config/package-versions/package-versions.js';

import {
    CORE_FRAMEWORK_VERSIONS,
    STORAGE_VERSIONS,
} from '../../../src/config/package-versions/version-groups.js';

describe('PACKAGE_VERSIONS aggregation', () => {
    it('includes entries from version groups', () => {
        for (const key of Object.keys(CORE_FRAMEWORK_VERSIONS)) {
            expect(PACKAGE_VERSIONS).toHaveProperty(key);
        }
        for (const key of Object.keys(STORAGE_VERSIONS)) {
            expect(PACKAGE_VERSIONS).toHaveProperty(key);
        }
    });
});
