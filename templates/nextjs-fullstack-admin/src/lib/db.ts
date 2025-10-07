import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

type DatabaseProvider = 'turso' | 'supabase';

type LibSQLConfig = {
    url: string;
    authToken?: string;
};

const DEFAULT_SQLITE_URL = 'file:../prisma/dev.db';
const DEFAULT_SUPABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';

function resolveProvider(): DatabaseProvider {
    const provider = (process.env.DATABASE_PROVIDER ?? 'turso').toLowerCase().trim();

    if (provider === 'supabase') {
        return 'supabase';
    }

    return 'turso';
}

function parseLibSQLConfig(rawUrl: string | undefined): LibSQLConfig {
    if (!rawUrl) {
        return { url: DEFAULT_SQLITE_URL };
    }

    const [base, query] = rawUrl.split('?');
    if (!query) {
        return { url: rawUrl };
    }

    const params = new URLSearchParams(query);
    const extractedToken = params.get('authToken') ?? undefined;
    if (extractedToken) {
        params.delete('authToken');
    }

    const remainingQuery = params.toString();
    const cleanUrl = remainingQuery ? `${base}?${remainingQuery}` : base;

    return { url: cleanUrl, authToken: extractedToken };
}

function ensurePrismaEnv(url: string): void {
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = url;
    }

    if (!process.env.PRISMA_DATABASE_URL) {
        process.env.PRISMA_DATABASE_URL = url;
    }
}

const provider = resolveProvider();
let prisma: PrismaClient;

if (provider === 'turso') {
    const parsed = parseLibSQLConfig(process.env.DATABASE_URL);
    const url = parsed.url || DEFAULT_SQLITE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN ?? parsed.authToken ?? undefined;

    if (url.startsWith('libsql://')) {
        ensurePrismaEnv(DEFAULT_SQLITE_URL);

        const adapter = new PrismaLibSQL({
            url,
            authToken,
        });

        prisma = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    } else {
        ensurePrismaEnv(url);

        prisma = new PrismaClient({
            datasources: {
                db: {
                    url,
                },
            },
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
} else {
    const databaseUrl =
        process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL ?? DEFAULT_SUPABASE_URL;

    ensurePrismaEnv(databaseUrl);

    prisma = new PrismaClient({
        datasources: {
            db: {
                url: databaseUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
}

export { prisma };
export default prisma;

// EOF
