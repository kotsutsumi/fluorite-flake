import { randomUUID } from 'node:crypto';
import { slugify } from '../slugify.js';
import type { ProjectConfig } from '../../commands/create.js';
import type {
  CloudProvisioner,
  CloudProvisioningRecord,
  ProvisionedDatabaseEnv,
  TursoDatabaseRecord,
  VercelBlobRecord,
  CloudflareR2Record,
  SupabaseStorageRecord,
} from './types.js';

const ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

function createMockDatabaseRecords(slug: string): TursoDatabaseRecord[] {
  return ENVIRONMENTS.map((env) => {
    // Use dashes instead of underscores for consistency with Turso naming requirements
    const dbName = `${slug}-${env}`;
    const hostname = `${dbName}.mock.turso.dev`;
    return {
      env,
      name: dbName,
      hostname,
      databaseUrl: `libsql://${hostname}`,
      authToken: `mock-token-${randomUUID()}`,
    };
  });
}

export class MockProvisioner implements CloudProvisioner {
  readonly mode = 'mock' as const;

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const projectSlug = slugify(config.projectName);
    const databases =
      config.database === 'turso' ? createMockDatabaseRecords(projectSlug) : undefined;

    // Create storage record based on selection
    let vercelBlob: VercelBlobRecord | undefined;
    let cloudflareR2: CloudflareR2Record | undefined;
    let supabaseStorage: SupabaseStorageRecord | undefined;

    if (config.storage === 'vercel-blob') {
      vercelBlob = {
        storeId: `${projectSlug}-blob`,
        storeName: `${projectSlug}-blob`,
        readWriteToken: `mock-blob-token-${randomUUID()}`,
      };
    } else if (config.storage === 'cloudflare-r2') {
      cloudflareR2 = {
        bucketName: `${projectSlug}-r2`,
        accountId: 'mock-account-id',
        accessKeyId: `mock-access-key-${randomUUID()}`,
        secretAccessKey: `mock-secret-${randomUUID()}`,
        endpoint: 'https://mock-account.r2.cloudflarestorage.com',
      };
    } else if (config.storage === 'supabase-storage') {
      supabaseStorage = {
        bucketName: `${projectSlug}-storage`,
        bucketId: `${projectSlug}-storage`,
        isPublic: false,
        projectRef: 'mock-project-ref',
        serviceRoleKey: `mock-service-key-${randomUUID()}`,
        url: `https://${projectSlug}.supabase.co/storage/v1`,
      };
    }

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso: databases
        ? {
            organization: 'mock-org',
            group: 'default',
            databases,
          }
        : undefined,
      vercel: config.deployment
        ? {
            projectId: randomUUID(),
            projectName: config.projectName,
            productionUrl: `https://${projectSlug}.mock.vercel.app`,
          }
        : undefined,
      vercelBlob,
      cloudflareR2,
      supabaseStorage,
    };
  }
}
