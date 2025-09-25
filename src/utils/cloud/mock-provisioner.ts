import { randomUUID } from 'node:crypto';
import { slugify } from '../slugify.js';
import type { ProjectConfig } from '../../commands/create.js';
import type {
  CloudProvisioner,
  CloudProvisioningRecord,
  ProvisionedDatabaseEnv,
  TursoDatabaseRecord,
} from './types.js';

const ENVIRONMENTS: ProvisionedDatabaseEnv[] = ['dev', 'stg', 'prod'];

function createMockDatabaseRecords(slug: string): TursoDatabaseRecord[] {
  return ENVIRONMENTS.map((env) => {
    const hostname = `${slug}-${env}.mock.turso.dev`;
    return {
      env,
      name: `${slug}_${env}`,
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
    const databases = createMockDatabaseRecords(projectSlug);

    return {
      mode: this.mode,
      createdAt: new Date().toISOString(),
      projectName: config.projectName,
      turso: {
        organization: 'mock-org',
        group: 'default',
        databases,
      },
      vercel: {
        projectId: randomUUID(),
        projectName: config.projectName,
        productionUrl: `https://${projectSlug}.mock.vercel.app`,
      },
      vercelBlob: {
        storeId: `${projectSlug}-blob`,
        storeName: `${projectSlug}-blob`,
        readWriteToken: `mock-blob-token-${randomUUID()}`,
      },
    };
  }
}
