import type { ProjectConfig } from '../../commands/create.js';

export type CloudMode = 'mock' | 'real';

export type ProvisionedDatabaseEnv = 'dev' | 'stg' | 'prod';

export interface TursoDatabaseRecord {
  env: ProvisionedDatabaseEnv;
  name: string;
  hostname: string;
  databaseUrl: string;
  authToken: string;
}

export interface TursoProvisioningRecord {
  organization: string;
  group: string;
  databases: TursoDatabaseRecord[];
}

export interface VercelProjectRecord {
  projectId: string;
  projectName: string;
  teamId?: string;
  productionUrl?: string;
}

export interface VercelBlobRecord {
  storeId: string;
  storeName: string;
  readWriteToken: string;
}

export interface CloudflareR2Record {
  bucketName: string;
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export interface SupabaseStorageRecord {
  projectRef?: string;
  bucketName: string;
  bucketId: string;
  isPublic: boolean;
  serviceRoleKey?: string;
  url?: string;
}

export interface CloudProvisioningRecord {
  mode: CloudMode;
  createdAt: string;
  projectName: string;
  turso?: TursoProvisioningRecord;
  vercel?: VercelProjectRecord;
  vercelBlob?: VercelBlobRecord;
  cloudflareR2?: CloudflareR2Record;
  supabaseStorage?: SupabaseStorageRecord;
}

export interface CloudProvisioner {
  readonly mode: CloudMode;
  provision(config: ProjectConfig): Promise<CloudProvisioningRecord>;
}
