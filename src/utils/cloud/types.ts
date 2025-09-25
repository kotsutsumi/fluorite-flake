import type { ProjectConfig } from '../../commands/create/types.js';

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
    bucketName: string;
    bucketId: string;
    isPublic: boolean;
    projectRef?: string;
    serviceRoleKey?: string;
    anonKey?: string;
    url?: string;
}

export interface AwsS3Record {
    bucketName: string;
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrl?: string;
}

export interface SupabaseDatabaseRecord {
    env: ProvisionedDatabaseEnv;
    projectRef: string;
    databaseUrl: string;
    dbPassword?: string;
    apiUrl?: string;
    anonKey: string;
    serviceRoleKey: string;
}

export interface SupabaseProvisioningRecord {
    projectName: string;
    organization?: string;
    databases: SupabaseDatabaseRecord[];
}

export interface CloudProvisioningRecord {
    mode: CloudMode;
    createdAt: string;
    projectName: string;
    turso?: TursoProvisioningRecord;
    supabase?: SupabaseProvisioningRecord;
    vercel?: VercelProjectRecord;
    vercelBlob?: VercelBlobRecord;
    cloudflareR2?: CloudflareR2Record;
    awsS3?: AwsS3Record;
    supabaseStorage?: SupabaseStorageRecord;
}

export interface CloudProvisioner {
    readonly mode: CloudMode;
    provision(config: ProjectConfig): Promise<CloudProvisioningRecord>;
}
