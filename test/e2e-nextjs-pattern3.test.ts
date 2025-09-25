import path from 'node:path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createProject } from '../src/commands/create.js';
import {
  cleanupTestDirectory,
  createTestDirectory,
  runPackageManagerCommand,
  verifyPackageScripts,
  verifyProjectStructure,
} from './e2e-utils.js';

const E2E_TIMEOUT = 300000; // 5 minutes for install/build operations
const COMMAND_TIMEOUT = 90000;

describe('E2E Next.js Pattern 3: Managed cloud stack', () => {
  const projectName = 'my-next-app';
  let testDir: string;
  let projectPath: string;
  let originalMode: string | undefined;
  let originalNodeEnv: string | undefined;

  beforeAll(async () => {
    originalMode = process.env.FLUORITE_CLOUD_MODE;
    originalNodeEnv = process.env.NODE_ENV;
    process.env.FLUORITE_CLOUD_MODE = 'mock';
    process.env.NODE_ENV = 'test';

    testDir = await createTestDirectory('e2e-pattern3-');
    projectPath = path.join(testDir, projectName);

    const config = {
      projectName,
      projectPath,
      framework: 'nextjs' as const,
      database: 'turso' as const,
      orm: 'prisma' as const,
      deployment: true,
      storage: 'vercel-blob' as const,
      auth: false,
      packageManager: 'pnpm' as const,
    };

    await createProject(config);
  }, E2E_TIMEOUT);

  afterAll(async () => {
    if (originalMode) {
      process.env.FLUORITE_CLOUD_MODE = originalMode;
    } else {
      process.env.FLUORITE_CLOUD_MODE = undefined;
    }

    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    }

    await cleanupTestDirectory(testDir);
  });

  it('should scaffold expected files with provisioning metadata', async () => {
    const expectedFiles = [
      'package.json',
      'fluorite-cloud.json',
      'scripts/destroy-deployment.ts',
      '.env.local',
      '.env.development',
      '.env.staging',
      '.env.production',
    ];

    const structureCheck = await verifyProjectStructure(projectPath, expectedFiles);
    expect(structureCheck.success).toBe(true);

    const metadata = await fs.readJSON(path.join(projectPath, 'fluorite-cloud.json'));
    expect(metadata.mode).toBe('mock');
    expect(metadata?.turso?.databases).toBeDefined();
    expect(metadata?.vercelBlob?.readWriteToken).toMatch(/^mock-blob-token-/);
  });

  it('should inject cloud credentials into env files without overriding local .env', async () => {
    const envLocal = await fs.readFile(path.join(projectPath, '.env.local'), 'utf-8');
    expect(envLocal).toMatch(/BLOB_READ_WRITE_TOKEN=mock-blob-token-/);
    expect(envLocal).toMatch(/DATABASE_URL=libsql:\/\//);

    const envFile = await fs.readFile(path.join(projectPath, '.env'), 'utf-8');
    expect(envFile).toMatch(/DATABASE_URL="?file:.*dev\.db"?/);
  });

  it('should register deployment scripts and run destroy successfully', async () => {
    const scriptsCheck = await verifyPackageScripts(projectPath, [
      'deploy',
      'deploy:destroy',
      'deploy:setup',
      'deploy:auto',
    ]);
    expect(scriptsCheck.success).toBe(true);

    const result = await runPackageManagerCommand(
      'pnpm',
      ['run', 'deploy:destroy'],
      projectPath,
      COMMAND_TIMEOUT
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Managed resources destroyed');

    const metadataExists = await fs.pathExists(path.join(projectPath, 'fluorite-cloud.json'));
    expect(metadataExists).toBe(false);
  });
});
