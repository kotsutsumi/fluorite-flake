import { Vercel } from "@vercel/sdk";
import { createClient as createTursoClient } from "@tursodatabase/api";

export type DashboardClientOptions = {
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

    if (options.vercelToken) {
        clients.vercel = new Vercel({ bearerToken: options.vercelToken });
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
