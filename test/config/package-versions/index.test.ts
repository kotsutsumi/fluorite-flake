import { describe, expect, it } from 'vitest';

import * as exports from '../../../src/config/package-versions/index.js';

describe('package-versions index re-exports', () => {
    it('exposes versions, categories, and helpers', () => {
        expect(exports.PACKAGE_VERSIONS.next).toBeDefined();
        expect(exports.PACKAGE_CATEGORIES.auth).toContain('better-auth');
        expect(exports.getPackageVersion('react')).toMatch(/\d/);
    });
});
