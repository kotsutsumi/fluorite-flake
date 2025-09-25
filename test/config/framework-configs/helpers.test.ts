import { describe, expect, it } from 'vitest';

import {
    getFrameworkConfig,
    getSupportedDatabases,
    getSupportedStorage,
    supportsFeature,
    validateConfiguration,
} from '../../../src/config/framework-configs/helpers.js';

describe('framework config helpers', () => {
    it('returns framework configuration metadata', () => {
        const config = getFrameworkConfig('nextjs');
        expect(config.displayName).toBe('Next.js');
        expect(config.supportedFeatures.auth).toBe(true);
    });

    it('reports supported features accurately', () => {
        expect(supportsFeature('nextjs', 'database')).toBe(true);
        expect(supportsFeature('tauri', 'storage')).toBe(false);
    });

    it('lists supported databases and storage per framework', () => {
        expect(getSupportedDatabases('expo')).toContain('turso');
        expect(getSupportedStorage('nextjs')).toContain('vercel-blob');
    });

    it('validates compatible configurations', () => {
        const result = validateConfiguration({
            framework: 'nextjs',
            database: 'supabase',
            orm: 'prisma',
            storage: 'vercel-blob',
        });

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('flags incompatible combinations with descriptive errors', () => {
        const result = validateConfiguration({
            framework: 'tauri',
            database: 'supabase',
            storage: 'vercel-blob',
        });

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Tauri does not support supabase database');
        expect(result.errors).toContain('Tauri does not support vercel-blob storage');
    });
});
