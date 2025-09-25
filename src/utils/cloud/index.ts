import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create.js';
import { upsertEnvFile } from '../env-file.js';
import { MockProvisioner } from './mock-provisioner.js';
import { RealProvisioner } from './real-provisioner.js';
import type { CloudProvisioningRecord, CloudProvisioner, TursoDatabaseRecord } from './types.js';

export const PROVISIONING_FILENAME = 'fluorite-cloud.json';

const AUTO_PROVISION_ENABLED = ['true', '1', 'on'].includes(
  String(process.env.FLUORITE_AUTO_PROVISION ?? 'true').toLowerCase()
);

function shouldProvision(config: ProjectConfig): boolean {
  return (
    AUTO_PROVISION_ENABLED &&
    config.framework === 'nextjs' &&
    config.database === 'turso' &&
    config.orm === 'prisma' &&
    config.storage === 'vercel-blob' &&
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

  if (forcedMode === 'real') {
    return new RealProvisioner();
  }

  if (process.env.NODE_ENV === 'test') {
    return new MockProvisioner();
  }

  return new RealProvisioner();
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
  const devDatabase = record.turso?.databases.find((item) => item.env === 'dev');
  const stgDatabase = record.turso?.databases.find((item) => item.env === 'stg');
  const prodDatabase = record.turso?.databases.find((item) => item.env === 'prod');

  const blobToken = record.vercelBlob?.readWriteToken;

  if (!devDatabase || !blobToken) {
    return;
  }

  const connectionFor = (database?: TursoDatabaseRecord) => {
    if (!database) {
      return undefined;
    }

    return {
      DATABASE_URL: `${database.databaseUrl}?authToken=${database.authToken}`,
      TURSO_DATABASE_URL: database.databaseUrl,
      TURSO_AUTH_TOKEN: database.authToken,
    };
  };

  const localUpdates = {
    ...connectionFor(devDatabase),
    BLOB_READ_WRITE_TOKEN: blobToken,
  };
  await upsertEnvFile(config.projectPath, '.env.local', localUpdates);
  await upsertEnvFile(config.projectPath, '.env.development', {
    ...connectionFor(devDatabase),
    BLOB_READ_WRITE_TOKEN: blobToken,
  });

  if (stgDatabase) {
    await upsertEnvFile(config.projectPath, '.env.staging', {
      ...connectionFor(stgDatabase),
      BLOB_READ_WRITE_TOKEN: blobToken,
    });
  }

  if (prodDatabase) {
    await upsertEnvFile(config.projectPath, '.env.production', {
      ...connectionFor(prodDatabase),
      BLOB_READ_WRITE_TOKEN: blobToken,
    });
  }
}
