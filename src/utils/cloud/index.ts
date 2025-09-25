import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create.js';
import { upsertEnvFile } from '../env-file.js';
import { CLIProvisioner } from './cli-provisioner.js';
import { MockProvisioner } from './mock-provisioner.js';
import type {
  CloudProvisioner,
  CloudProvisioningRecord,
  SupabaseDatabaseRecord,
  TursoDatabaseRecord,
} from './types.js';

export const PROVISIONING_FILENAME = 'fluorite-cloud.json';

const AUTO_PROVISION_ENABLED = ['true', '1', 'on'].includes(
  String(process.env.FLUORITE_AUTO_PROVISION ?? 'true').toLowerCase()
);

function shouldProvision(config: ProjectConfig): boolean {
  // Enable provisioning for any cloud storage or database that requires it
  const needsProvisioning =
    config.database === 'turso' ||
    config.database === 'supabase' ||
    (config.storage !== 'none' && config.storage !== undefined);

  return (
    AUTO_PROVISION_ENABLED &&
    config.framework === 'nextjs' &&
    needsProvisioning &&
    config.deployment === true
  );
}

export function isProvisioningEligible(config: ProjectConfig): boolean {
  return shouldProvision(config);
}

function resolveProvisioner(): CloudProvisioner {
  const forcedMode = process.env.FLUORITE_CLOUD_MODE?.toLowerCase();

  if (forcedMode === 'mock') {
    return new MockProvisioner();
  }

  if (forcedMode === 'real' || forcedMode === 'cli') {
    return new CLIProvisioner();
  }

  if (process.env.NODE_ENV === 'test') {
    return new MockProvisioner();
  }

  // Default to CLI provisioner for automatic resource creation
  return new CLIProvisioner();
}

export async function provisionCloudResources(
  config: ProjectConfig
): Promise<CloudProvisioningRecord | null> {
  if (!shouldProvision(config)) {
    return null;
  }

  const provisioner = resolveProvisioner();
  const record = await provisioner.provision(config);
  await writeProvisioningRecord(config.projectPath, record);
  await applyEnvUpdates(config, record);
  return record;
}

async function writeProvisioningRecord(projectPath: string, record: CloudProvisioningRecord) {
  const targetPath = path.join(projectPath, PROVISIONING_FILENAME);
  await fs.writeJSON(targetPath, record, { spaces: 2 });
}

async function applyEnvUpdates(config: ProjectConfig, record: CloudProvisioningRecord) {
  // Handle Turso database
  const devTursoDatabase = record.turso?.databases.find((item) => item.env === 'dev');
  const stgTursoDatabase = record.turso?.databases.find((item) => item.env === 'stg');
  const prodTursoDatabase = record.turso?.databases.find((item) => item.env === 'prod');

  // Handle Supabase database
  const devSupabaseDb = record.supabase?.databases.find((item) => item.env === 'dev');
  const stgSupabaseDb = record.supabase?.databases.find((item) => item.env === 'stg');
  const prodSupabaseDb = record.supabase?.databases.find((item) => item.env === 'prod');

  const connectionForTurso = (database?: TursoDatabaseRecord) => {
    const result: Record<string, string> = {};
    if (!database) {
      return result;
    }

    result.DATABASE_URL = `${database.databaseUrl}?authToken=${database.authToken}`;
    result.TURSO_DATABASE_URL = database.databaseUrl;
    result.TURSO_AUTH_TOKEN = database.authToken;

    return result;
  };

  const connectionForSupabase = (database?: SupabaseDatabaseRecord) => {
    const result: Record<string, string> = {};
    if (!database) {
      return result;
    }

    result.DATABASE_URL = database.databaseUrl;
    result.NEXT_PUBLIC_SUPABASE_URL = `https://${database.projectRef}.supabase.co`;
    result.NEXT_PUBLIC_SUPABASE_ANON_KEY = database.anonKey;
    result.SUPABASE_SERVICE_ROLE_KEY = database.serviceRoleKey;

    return result;
  };

  const storageEnvs = () => {
    const envs: Record<string, string> = {};

    if (record.vercelBlob) {
      envs.BLOB_READ_WRITE_TOKEN = record.vercelBlob.readWriteToken;
    }

    if (record.cloudflareR2) {
      envs.R2_BUCKET_NAME = record.cloudflareR2.bucketName;
      if (record.cloudflareR2.accountId) {
        envs.R2_ACCOUNT_ID = record.cloudflareR2.accountId;
      }
      if (record.cloudflareR2.accessKeyId) {
        envs.R2_ACCESS_KEY_ID = record.cloudflareR2.accessKeyId;
      }
      if (record.cloudflareR2.secretAccessKey) {
        envs.R2_SECRET_ACCESS_KEY = record.cloudflareR2.secretAccessKey;
      }
      if (record.cloudflareR2.endpoint) {
        envs.R2_ENDPOINT = record.cloudflareR2.endpoint;
      }
    }

    if (record.awsS3) {
      envs.AWS_S3_BUCKET = record.awsS3.bucketName;
      envs.AWS_REGION = record.awsS3.region;
      if (record.awsS3.accessKeyId) {
        envs.AWS_ACCESS_KEY_ID = record.awsS3.accessKeyId;
      }
      if (record.awsS3.secretAccessKey) {
        envs.AWS_SECRET_ACCESS_KEY = record.awsS3.secretAccessKey;
      }
    }

    if (record.supabaseStorage) {
      envs.SUPABASE_STORAGE_BUCKET = record.supabaseStorage.bucketName;
      if (record.supabaseStorage.url) {
        envs.SUPABASE_STORAGE_URL = record.supabaseStorage.url;
      }
    }

    return envs;
  };

  // Local/Development environment
  const localUpdates = {
    ...connectionForTurso(devTursoDatabase),
    ...connectionForSupabase(devSupabaseDb),
    ...storageEnvs(),
  };

  if (Object.keys(localUpdates).length > 0) {
    await upsertEnvFile(config.projectPath, '.env.local', localUpdates);
    await upsertEnvFile(config.projectPath, '.env.development', localUpdates);
  }

  // Staging environment
  const stagingUpdates = {
    ...connectionForTurso(stgTursoDatabase),
    ...connectionForSupabase(stgSupabaseDb),
    ...storageEnvs(),
  };

  if (Object.keys(stagingUpdates).length > 0) {
    await upsertEnvFile(config.projectPath, '.env.staging', stagingUpdates);
  }

  // Production environment
  const productionUpdates = {
    ...connectionForTurso(prodTursoDatabase),
    ...connectionForSupabase(prodSupabaseDb),
    ...storageEnvs(),
  };

  if (Object.keys(productionUpdates).length > 0) {
    await upsertEnvFile(config.projectPath, '.env.production', productionUpdates);
  }
}
