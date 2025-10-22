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
 * ダッシュボードで利用する外部サービス向けクライアントを遅延生成する。
 * トークンや組織 ID が無くても呼び出せるようにし、開発時のプレースホルダーにも対応する。
 */
export function createDashboardClients(options: DashboardClientOptions = {}): DashboardClients {
    const clients: DashboardClients = {};

    // 優先順位を明示して Vercel トークンを取り出す（設定ファイル > オプション直指定）。
    const vercelToken = options.vercel?.token ?? options.vercelToken;

    if (vercelToken) {
        clients.vercel = new Vercel({ bearerToken: vercelToken });
    }

    // Turso はトークンと組織 ID の両方が揃ったときのみクライアントを生成する。
    if (options.tursoToken && options.tursoOrg) {
        clients.turso = createTursoClient({
            token: options.tursoToken,
            org: options.tursoOrg,
        });
    }

    return clients;
}

// ファイル終端
