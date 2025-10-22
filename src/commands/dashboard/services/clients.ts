import { Vercel } from "@vercel/sdk";
import { createClient as createTursoClient } from "@tursodatabase/api";

export type VercelClientOptions = {
    token?: string;
};

export type DashboardClientOptions = {
    vercel?: VercelClientOptions;
    vercelToken?: string;
    tursoToken?: string;
    tursoOrg?: string;
};

export type DashboardClients = {
    vercel?: Vercel;
    turso?: ReturnType<typeof createTursoClient>;
};

/**
 * Lazy factory for external service SDK clients used by the dashboard.
 * Tokens and organization identifiers are optional so the dashboard shell
 * can render without credentials during development.
 */
export function createDashboardClients(options: DashboardClientOptions = {}): DashboardClients {
    const clients: DashboardClients = {};

    const vercelToken = options.vercel?.token ?? options.vercelToken;

    if (vercelToken) {
        clients.vercel = new Vercel({ bearerToken: vercelToken });
    }

    if (options.tursoToken && options.tursoOrg) {
        clients.turso = createTursoClient({
            token: options.tursoToken,
            org: options.tursoOrg,
        });
    }

    return clients;
}

// EOF
