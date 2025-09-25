import { execa } from 'execa';
import type { ProjectConfig } from '../../commands/create.js';
import { slugify } from '../slugify.js';
import { ProvisioningError } from './errors.js';
import type {
  CloudProvisioner,
  CloudProvisioningRecord,
  ProvisionedDatabaseEnv,
  TursoDatabaseRecord,
  VercelBlobRecord,
  VercelProjectRecord,
} from './types.js';

const TURSO_API_BASE = 'https://api.turso.tech';
const VERCEL_API_BASE = 'https://api.vercel.com';

const DB_ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];
const VERCEL_TARGETS: Record<ProvisionedDatabaseEnv, ('development' | 'preview' | 'production')[]> =
  {
    dev: ['development'],
    stg: ['preview'],
    prod: ['production'],
  };

interface TursoDatabaseResponse {
  database?: {
    Name?: string;
    name?: string;
    Hostname?: string;
    hostname?: string;
  };
}

interface TursoTokenResponse {
  jwt?: string;
  token?: string;
  auth_token?: { token?: string };
}

interface VercelProjectResponse {
  id: string;
  name: string;
  link?: {
    url?: string;
  };
}

export class RealProvisioner implements CloudProvisioner {
  readonly mode = 'real' as const;

  private readonly tursoToken: string;
  private readonly tursoOrg: string;
  private readonly tursoGroup: string;
  private readonly tursoLocation?: string;
  private readonly vercelToken: string;
  private readonly vercelTeamId?: string;

  constructor() {
    this.tursoToken =
      process.env.TURSO_API_TOKEN || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN || '';
    this.tursoOrg =
      process.env.TURSO_ORG_SLUG || process.env.TURSO_ORGANIZATION || process.env.TURSO_ORG || '';
    this.tursoGroup = process.env.TURSO_GROUP || 'default';
    this.tursoLocation = process.env.TURSO_LOCATION;
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    this.vercelTeamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_TEAM || undefined;

    if (!this.tursoToken || !this.tursoOrg) {
      throw new ProvisioningError(
        'Turso provisioning requires TURSO_API_TOKEN and TURSO_ORG_SLUG environment variables.'
      );
    }

    if (!this.vercelToken) {
      throw new ProvisioningError(
        'Vercel provisioning requires the VERCEL_TOKEN environment variable.'
      );
    }
  }

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const slug = slugify(config.projectName);
    const turso = await this.ensureTursoDatabases(slug);
    const vercel = await this.ensureVercelProject(config.projectName);
    await this.configureVercelEnv(vercel.projectId, turso, slug);
    const vercelBlob = await this.ensureVercelBlobStore(vercel, slug);

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso,
      vercel,
      vercelBlob,
    };
  }

  private async ensureTursoDatabases(slug: string) {
    const databases: TursoDatabaseRecord[] = [];

    for (const env of DB_ENVIRONMENTS) {
      const dbName = `${slug}_${env}`;
      const hostname = await this.createOrFetchTursoDatabase(dbName);
      const authToken = await this.createTursoToken(dbName);
      databases.push({
        env,
        name: dbName,
        hostname,
        databaseUrl: `libsql://${hostname}`,
        authToken,
      });
    }

    return {
      organization: this.tursoOrg,
      group: this.tursoGroup,
      databases,
    };
  }

  private async createOrFetchTursoDatabase(dbName: string) {
    const body: Record<string, unknown> = {
      name: dbName,
      group: this.tursoGroup,
    };

    if (this.tursoLocation) {
      body.location = this.tursoLocation;
    }

    const response = await this.tursoRequest(`/v1/organizations/${this.tursoOrg}/databases`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (response.status === 409) {
      const existing = await this.tursoRequest(
        `/v1/organizations/${this.tursoOrg}/databases/${dbName}`,
        {
          method: 'GET',
        }
      );
      const json = (await existing.json()) as TursoDatabaseResponse;
      return this.extractHostname(json, dbName);
    }

    const json = (await response.json()) as TursoDatabaseResponse;
    return this.extractHostname(json, dbName);
  }

  private extractHostname(response: TursoDatabaseResponse, fallback: string) {
    const candidate =
      response.database?.Hostname ??
      response.database?.hostname ??
      `${fallback}-${this.tursoOrg}.turso.io`;
    return candidate;
  }

  private async createTursoToken(dbName: string) {
    const response = await this.tursoRequest(
      `/v1/organizations/${this.tursoOrg}/databases/${dbName}/auth/tokens?authorization=full-access`,
      {
        method: 'POST',
      }
    );
    const json = (await response.json()) as TursoTokenResponse;
    const token = json.jwt || json.token || json.auth_token?.token;
    if (!token) {
      throw new ProvisioningError(
        `Turso token generation returned an empty response for ${dbName}.`
      );
    }
    return token;
  }

  private async ensureVercelProject(projectName: string): Promise<VercelProjectRecord> {
    const query = this.vercelTeamId ? `?teamId=${encodeURIComponent(this.vercelTeamId)}` : '';
    const response = await this.vercelRequest(`/v11/projects${query}`, {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        framework: 'nextjs',
      }),
    });

    if (response.status === 409) {
      const existing = await this.vercelRequest(
        `/v9/projects/${encodeURIComponent(projectName)}${query}`,
        {
          method: 'GET',
        }
      );
      const existingJson = (await existing.json()) as VercelProjectResponse;
      return {
        projectId: existingJson.id,
        projectName: existingJson.name,
        teamId: this.vercelTeamId,
        productionUrl: existingJson.link?.url,
      };
    }

    const json = (await response.json()) as VercelProjectResponse;
    return {
      projectId: json.id,
      projectName: json.name,
      teamId: this.vercelTeamId,
      productionUrl: json.link?.url,
    };
  }

  private async configureVercelEnv(
    projectId: string,
    turso: { databases: TursoDatabaseRecord[] },
    slug: string
  ) {
    const devDb = turso.databases.find((item) => item.env === 'dev');
    const stgDb = turso.databases.find((item) => item.env === 'stg');
    const prodDb = turso.databases.find((item) => item.env === 'prod');

    const query = this.vercelTeamId
      ? `?teamId=${encodeURIComponent(this.vercelTeamId)}&upsert=true`
      : '?upsert=true';

    const sendEnv = async (
      database: TursoDatabaseRecord | undefined,
      target: ('development' | 'preview' | 'production')[]
    ) => {
      if (!database) {
        return;
      }

      const connectionUrl = `${database.databaseUrl}?authToken=${database.authToken}`;
      const payload = [
        { key: 'DATABASE_URL', value: connectionUrl, type: 'sensitive', target },
        { key: 'TURSO_DATABASE_URL', value: database.databaseUrl, type: 'sensitive', target },
        { key: 'TURSO_AUTH_TOKEN', value: database.authToken, type: 'sensitive', target },
      ];

      await this.vercelRequest(`/v9/projects/${encodeURIComponent(projectId)}/env${query}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    };

    await sendEnv(devDb, VERCEL_TARGETS.dev);
    await sendEnv(stgDb, VERCEL_TARGETS.stg);
    await sendEnv(prodDb, VERCEL_TARGETS.prod);

    await this.vercelRequest(`/v9/projects/${encodeURIComponent(projectId)}/env${query}`, {
      method: 'POST',
      body: JSON.stringify([
        {
          key: 'FLUORITE_PROJECT_SLUG',
          value: slug,
          type: 'sensitive',
          target: ['development', 'preview', 'production'],
        },
      ]),
    });
  }

  private async ensureVercelBlobStore(
    project: VercelProjectRecord,
    slug: string
  ): Promise<VercelBlobRecord> {
    await this.ensureVercelCli();

    const storeName = `${slug}-blob`;
    const cliArgs = [
      'storage',
      'store',
      'add',
      storeName,
      '--project',
      project.projectName,
      '--yes',
    ];
    if (this.vercelTeamId) {
      cliArgs.push('--scope', this.vercelTeamId);
    }

    await this.runVercelCli(cliArgs);

    const tokenArgs = [
      'storage',
      'token',
      'create',
      storeName,
      '--read-write',
      '--project',
      project.projectName,
      '--yes',
    ];
    if (this.vercelTeamId) {
      tokenArgs.push('--scope', this.vercelTeamId);
    }

    const tokenOutput = await this.runVercelCli(tokenArgs);
    const tokenMatch = tokenOutput.match(/(rw\w+)/i);
    const readWriteToken = tokenMatch?.[1] ?? tokenOutput.trim();

    await this.vercelRequest(
      `/v9/projects/${encodeURIComponent(project.projectId)}/env${
        this.vercelTeamId
          ? `?teamId=${encodeURIComponent(this.vercelTeamId)}&upsert=true`
          : '?upsert=true'
      }`,
      {
        method: 'POST',
        body: JSON.stringify([
          {
            key: 'BLOB_READ_WRITE_TOKEN',
            value: readWriteToken,
            type: 'sensitive',
            target: ['development', 'preview', 'production'],
          },
        ]),
      }
    );

    return {
      storeId: storeName,
      storeName,
      readWriteToken,
    };
  }

  private async ensureVercelCli() {
    try {
      await execa('vercel', ['--version']);
    } catch (error) {
      throw new ProvisioningError(
        'The Vercel CLI is required to create Blob stores automatically. Please install it globally with "pnpm add -g vercel" or make it available on PATH before running the generator.',
        error
      );
    }
  }

  private async runVercelCli(args: string[]) {
    try {
      const { stdout } = await execa('vercel', args, {
        env: {
          ...process.env,
          VERCEL_TOKEN: this.vercelToken,
        },
      });
      return stdout;
    } catch (error) {
      throw new ProvisioningError(
        `Failed to run Vercel CLI command: vercel ${args.join(' ')}`,
        error
      );
    }
  }

  private async tursoRequest(path: string, init: RequestInit) {
    const response = await fetch(`${TURSO_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.tursoToken}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok && response.status !== 409) {
      const text = await response.text().catch(() => '');
      throw new ProvisioningError(
        `Turso API request to ${path} failed with status ${response.status}: ${text}`
      );
    }

    return response;
  }

  private async vercelRequest(path: string, init: RequestInit) {
    const response = await fetch(`${VERCEL_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    if (!response.ok && response.status !== 409) {
      const text = await response.text().catch(() => '');
      throw new ProvisioningError(
        `Vercel API request to ${path} failed with status ${response.status}: ${text}`
      );
    }

    return response;
  }
}
