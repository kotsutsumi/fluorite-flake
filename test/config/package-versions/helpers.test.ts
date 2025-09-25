import { describe, expect, it } from 'vitest';

import {
    getPackageVersion,
    getPackageVersions,
} from '../../../src/config/package-versions/helpers.js';

describe('package version helpers', () => {
    it('returns known versions when available', () => {
        expect(getPackageVersion('react')).toBe('19.0.0');
    });

    it('falls back to latest for unknown packages', () => {
        expect(getPackageVersion('totally-made-up-package')).toBe('latest');
    });

    it('builds version maps for multiple packages', () => {
        const versions = getPackageVersions(['next', 'react']);
        expect(versions).toEqual({
            next: '15.5.4',
            react: '19.0.0',
        });
    });
});
