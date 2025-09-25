import { describe, expect, it } from 'vitest';

import { PACKAGE_CATEGORIES } from '../../../src/config/package-versions/categories.js';

describe('PACKAGE_CATEGORIES', () => {
    it('contains expected framework entries', () => {
        expect(PACKAGE_CATEGORIES.nextjs.dependencies).toEqual(
            expect.arrayContaining(['next', 'react'])
        );
        expect(PACKAGE_CATEGORIES.expo.dependencies).toContain('expo');
        expect(PACKAGE_CATEGORIES.tauri.dependencies).toContain('@tauri-apps/api');
    });

    it('contains storage and auth groupings', () => {
        expect(PACKAGE_CATEGORIES.storage['vercel-blob']).toContain('@vercel/blob');
        expect(PACKAGE_CATEGORIES.auth).toContain('better-auth');
    });
});
