import type { OrmType } from './types.js';

export const DATABASE_CONFIGS = {
    turso: {
        name: 'Turso',
        description: 'SQLite at the edge with libSQL',
        envVars: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'DATABASE_URL'],
        supportedOrms: ['prisma', 'drizzle'] as OrmType[],
    },
    supabase: {
        name: 'Supabase',
        description: 'PostgreSQL with built-in auth',
        envVars: [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'DATABASE_URL',
        ],
        supportedOrms: ['prisma', 'drizzle'] as OrmType[],
    },
} as const;
