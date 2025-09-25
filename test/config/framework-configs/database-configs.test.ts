import { describe, expect, it } from 'vitest';

import { DATABASE_CONFIGS } from '../../../src/config/framework-configs/database-configs.js';
import type { OrmType } from '../../../src/config/framework-configs/types.js';

describe('DATABASE_CONFIGS', () => {
    describe('turso configuration', () => {
        const tursoConfig = DATABASE_CONFIGS.turso;

        it('should have correct name and description', () => {
            expect(tursoConfig.name).toBe('Turso');
            expect(tursoConfig.description).toBe('SQLite at the edge with libSQL');
        });

        it('should have required environment variables', () => {
            const expectedEnvVars = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'DATABASE_URL'];
            expect(tursoConfig.envVars).toEqual(expectedEnvVars);
        });

        it('should support both prisma and drizzle ORMs', () => {
            const expectedOrms: OrmType[] = ['prisma', 'drizzle'];
            expect(tursoConfig.supportedOrms).toEqual(expectedOrms);
        });

        it('should have at least one supported ORM', () => {
            expect(tursoConfig.supportedOrms.length).toBeGreaterThan(0);
        });
    });

    describe('supabase configuration', () => {
        const supabaseConfig = DATABASE_CONFIGS.supabase;

        it('should have correct name and description', () => {
            expect(supabaseConfig.name).toBe('Supabase');
            expect(supabaseConfig.description).toBe('PostgreSQL with built-in auth');
        });

        it('should have required environment variables', () => {
            const expectedEnvVars = [
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_ROLE_KEY',
                'DATABASE_URL',
            ];
            expect(supabaseConfig.envVars).toEqual(expectedEnvVars);
        });

        it('should support both prisma and drizzle ORMs', () => {
            const expectedOrms: OrmType[] = ['prisma', 'drizzle'];
            expect(supabaseConfig.supportedOrms).toEqual(expectedOrms);
        });

        it('should have at least one supported ORM', () => {
            expect(supabaseConfig.supportedOrms.length).toBeGreaterThan(0);
        });
    });

    describe('database configs structure', () => {
        it('should have both turso and supabase configurations', () => {
            expect(DATABASE_CONFIGS).toHaveProperty('turso');
            expect(DATABASE_CONFIGS).toHaveProperty('supabase');
        });

        it('should have exactly 2 database configurations', () => {
            expect(Object.keys(DATABASE_CONFIGS)).toHaveLength(2);
        });

        it('should have consistent structure for all database configs', () => {
            for (const [_key, config] of Object.entries(DATABASE_CONFIGS)) {
                expect(config).toHaveProperty('name');
                expect(config).toHaveProperty('description');
                expect(config).toHaveProperty('envVars');
                expect(config).toHaveProperty('supportedOrms');

                expect(typeof config.name).toBe('string');
                expect(typeof config.description).toBe('string');
                expect(Array.isArray(config.envVars)).toBe(true);
                expect(Array.isArray(config.supportedOrms)).toBe(true);

                expect(config.name.length).toBeGreaterThan(0);
                expect(config.description.length).toBeGreaterThan(0);
                expect(config.envVars.length).toBeGreaterThan(0);
            }
        });

        it('should have unique environment variable names across databases', () => {
            const allEnvVars = Object.values(DATABASE_CONFIGS)
                .flatMap((config) => config.envVars)
                .filter((envVar) => envVar !== 'DATABASE_URL'); // DATABASE_URL is shared

            const uniqueEnvVars = [...new Set(allEnvVars)];
            expect(allEnvVars).toHaveLength(uniqueEnvVars.length);
        });
    });

    describe('ORM support validation', () => {
        it('should only contain valid ORM types', () => {
            const validOrms: OrmType[] = ['prisma', 'drizzle'];

            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                for (const orm of config.supportedOrms) {
                    expect(validOrms).toContain(orm);
                }
            }
        });

        it('should have all databases support at least one ORM', () => {
            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                expect(config.supportedOrms.length).toBeGreaterThan(0);
            }
        });
    });

    describe('environment variables validation', () => {
        it('should not have empty environment variable names', () => {
            for (const [_dbName, config] of Object.entries(DATABASE_CONFIGS)) {
                for (const envVar of config.envVars) {
                    expect(envVar.trim()).toBe(envVar);
                    expect(envVar.length).toBeGreaterThan(0);
                }
            }
        });

        it('should have all required Turso environment variables', () => {
            const tursoEnvVars = DATABASE_CONFIGS.turso.envVars;
            expect(tursoEnvVars).toContain('TURSO_DATABASE_URL');
            expect(tursoEnvVars).toContain('TURSO_AUTH_TOKEN');
            expect(tursoEnvVars).toContain('DATABASE_URL');
        });

        it('should have all required Supabase environment variables', () => {
            const supabaseEnvVars = DATABASE_CONFIGS.supabase.envVars;
            expect(supabaseEnvVars).toContain('NEXT_PUBLIC_SUPABASE_URL');
            expect(supabaseEnvVars).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
            expect(supabaseEnvVars).toContain('SUPABASE_SERVICE_ROLE_KEY');
            expect(supabaseEnvVars).toContain('DATABASE_URL');
        });
    });
});
