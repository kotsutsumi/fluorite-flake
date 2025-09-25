import { randomUUID } from 'node:crypto';
import type { ProjectConfig } from '../../commands/create.js';
import { slugify } from '../slugify.js';
import type {
  AwsS3Record,
  CloudProvisioner,
  CloudProvisioningRecord,
  CloudflareR2Record,
  ProvisionedDatabaseEnv,
  SupabaseDatabaseRecord,
  SupabaseStorageRecord,
  TursoDatabaseRecord,
  VercelBlobRecord,
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

function createMockSupabaseRecords(slug: string): SupabaseDatabaseRecord[] {
  return ENVIRONMENTS.map((env) => {
    const projectRef = `mock-${slug}-${env}-${randomUUID().substring(0, 8)}`;
    return {
      env,
      projectRef,
      databaseUrl: `https://${projectRef}.supabase.co`,
      anonKey: `mock-anon-key-${randomUUID()}`,
      serviceRoleKey: `mock-service-key-${randomUUID()}`,
    };
  });
}

export class MockProvisioner implements CloudProvisioner {
  readonly mode = 'mock' as const;

  async provision(config: ProjectConfig): Promise<CloudProvisioningRecord> {
    const projectSlug = slugify(config.projectName);

    // Create database records based on selection
    const tursoDatabases =
      config.database === 'turso' ? createMockDatabaseRecords(projectSlug) : undefined;
    const supabaseDatabases =
      config.database === 'supabase' ? createMockSupabaseRecords(projectSlug) : undefined;

    // Create storage record based on selection
    let vercelBlob: VercelBlobRecord | undefined;
    let cloudflareR2: CloudflareR2Record | undefined;
    let awsS3: AwsS3Record | undefined;
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
    } else if (config.storage === 'aws-s3') {
      awsS3 = {
        bucketName: `${projectSlug}-s3-bucket`,
        region: 'us-east-1',
        accessKeyId: `mock-access-key-${randomUUID()}`,
        secretAccessKey: `mock-secret-${randomUUID()}`,
        publicUrl: `https://${projectSlug}-s3-bucket.s3.us-east-1.amazonaws.com`,
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
      turso: tursoDatabases
        ? {
            organization: 'mock-org',
            group: 'default',
            databases: tursoDatabases,
          }
        : undefined,
      supabase: supabaseDatabases
        ? {
            projectName: config.projectName,
            organization: 'mock-org',
            databases: supabaseDatabases,
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
      awsS3,
      supabaseStorage,
    };
  }
}
