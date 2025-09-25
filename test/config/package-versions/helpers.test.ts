import { describe, expect, it } from 'vitest';

import {
    getPackageVersion,
    getPackageVersions,
} from '../../../src/config/package-versions/helpers.js';

describe('package version helpers', () => {
    it('returns versions for known packages', () => {
        expect(getPackageVersion('next')).toMatch(/\d/);
        expect(getPackageVersion('unknown-package')).toBe('latest');
    });

    it('returns version map for multiple packages', () => {
        const versions = getPackageVersions(['next', 'react']);
        expect(Object.keys(versions)).toEqual(['next', 'react']);
        expect(versions.next).toMatch(/\d/);
    });
});
