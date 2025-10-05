import prisma from '@/lib/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins/organization';
import { APP_ROLES } from './roles';

type DatabaseProvider = 'turso' | 'supabase';

// Utilities to derive trusted origins
const toURL = (value?: string | null) => {
    if (!value) {
        return undefined;
    }

    if (value.startsWith('http')) {
        return value;
    }

    return `https://${value}`;
};

const getVercelURL = () => {
    const branchUrl = toURL(process.env.VERCEL_BRANCH_URL);
    const deploymentUrl = toURL(process.env.VERCEL_URL);
    const publicUrl = toURL(process.env.NEXT_PUBLIC_VERCEL_URL);

    return branchUrl ?? deploymentUrl ?? publicUrl;
};

const getBaseURL = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    const vercelUrl = getVercelURL();
    const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;

    if (environment === 'preview' && vercelUrl) {
        return vercelUrl;
    }

    const fallbackOrder = [
        toURL(process.env.BETTER_AUTH_URL),
        toURL(process.env.NEXT_PUBLIC_APP_URL),
        vercelUrl,
    ];

    for (const candidate of fallbackOrder) {
        if (candidate) {
            return candidate;
        }
    }

    return 'http://localhost:3000';
};

const resolveAdapterProvider = (): DatabaseProvider => {
    const provider = (process.env.DATABASE_PROVIDER ?? 'turso').toLowerCase().trim();

    if (provider === 'supabase') {
        return 'supabase';
    }

    return 'turso';
};

// Get trusted origins safely
const expandLocalVariants = (origin: string): string[] => {
    try {
        const url = new URL(origin);
        const hosts = [url.hostname];

        if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
            hosts.push('localhost', '127.0.0.1', '0.0.0.0');
        }

        return hosts.map((host) => `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`);
    } catch {
        return [origin];
    }
};

const getTrustedOrigins = () => {
    const candidates = [
        getBaseURL(),
        toURL(process.env.BETTER_AUTH_URL),
        toURL(process.env.NEXT_PUBLIC_APP_URL),
        getVercelURL(),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
    ];

    const expanded = candidates
        .filter((origin): origin is string => Boolean(origin))
        .flatMap(expandLocalVariants);

    return [...new Set(expanded)];
};

const adapterProvider = resolveAdapterProvider() === 'supabase' ? 'postgresql' : 'sqlite';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: adapterProvider,
    }),
    secret: process.env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
    baseURL: getBaseURL(),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
        minPasswordLength: 8,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,
        },
        cookie: {
            secure: getBaseURL().startsWith('https://'),
            sameSite: 'lax',
            httpOnly: true,
            path: '/',
            domain: (() => {
                const baseURL = getBaseURL();
                const isProduction =
                    process.env.NODE_ENV === 'production' &&
                    process.env.VERCEL_ENV === 'production';
                const isStaging = process.env.NEXT_PUBLIC_ENV === 'staging';

                if ((isProduction || isStaging) && baseURL.startsWith('https://')) {
                    return new URL(baseURL).hostname;
                }

                return undefined;
            })(),
        },
    },
    user: {
        additionalFields: {
            role: {
                type: 'string',
                defaultValue: APP_ROLES.USER,
            },
        },
    },
    plugins: [
        organization({
            allowUserToCreateOrganization: false,
        }),
    ],
    trustedOrigins: getTrustedOrigins(),
});

// EOF
