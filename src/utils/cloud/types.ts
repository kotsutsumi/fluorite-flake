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

export interface CloudProvisioningRecord {
  mode: CloudMode;
  createdAt: string;
  projectName: string;
  turso?: TursoProvisioningRecord;
  vercel?: VercelProjectRecord;
  vercelBlob?: VercelBlobRecord;
}

export interface CloudProvisioner {
  readonly mode: CloudMode;
  provision(config: ProjectConfig): Promise<CloudProvisioningRecord>;
}
