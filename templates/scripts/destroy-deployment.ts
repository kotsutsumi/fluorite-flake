#!/usr/bin/env tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const TURSO_API_BASE = 'https://api.turso.tech';
const VERCEL_API_BASE = 'https://api.vercel.com';
const PROVISIONING_FILE = 'fluorite-cloud.json';

interface TursoDatabaseRecord {
  name: string;
}

interface TursoProvisioningRecord {
  organization: string;
  databases: TursoDatabaseRecord[];
}

interface VercelProjectRecord {
  projectId: string;
  projectName: string;
  teamId?: string;
}

interface VercelBlobRecord {
  storeName: string;
}

interface CloudProvisioningRecord {
  mode: 'mock' | 'real';
  turso?: TursoProvisioningRecord;
  vercel?: VercelProjectRecord;
  vercelBlob?: VercelBlobRecord;
}

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr.trim()}`));
      }
    });
  });
}

async function deleteTurso(record: CloudProvisioningRecord) {
  const turso = record.turso;
  if (!turso || !turso.databases.length) {
    return;
  }

  const token =
    process.env.TURSO_API_TOKEN || process.env.TURSO_TOKEN || process.env.TURSO_AUTH_TOKEN;
  if (!token) {
    console.warn('\n⚠️  Skipping Turso cleanup because TURSO_API_TOKEN is not set.');
    return;
  }

  for (const database of turso.databases) {
    const response = await fetch(
      `${TURSO_API_BASE}/v1/organizations/${turso.organization}/databases/${database.name}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok && response.status !== 404) {
      const body = await response.text().catch(() => '');
      console.warn(
        `⚠️  Failed to delete Turso database ${database.name}: ${response.status} ${body}`
      );
    } else {
      console.log(`🗑️  Removed Turso database ${database.name}`);
    }
  }
}

async function deleteVercelProject(record: CloudProvisioningRecord) {
  const project = record.vercel;
  if (!project) {
    return;
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn('\n⚠️  Skipping Vercel project removal because VERCEL_TOKEN is not set.');
    return;
  }

  const teamQuery = project.teamId ? `?teamId=${encodeURIComponent(project.teamId)}` : '';

  const response = await fetch(
    `${VERCEL_API_BASE}/v10/projects/${encodeURIComponent(project.projectId)}${teamQuery}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => '');
    console.warn(
      `⚠️  Failed to delete Vercel project ${project.projectId}: ${response.status} ${body}`
    );
  } else {
    console.log(`🗑️  Removed Vercel project ${project.projectName}`);
  }
}

async function deleteVercelBlob(record: CloudProvisioningRecord) {
  const store = record.vercelBlob;
  if (!store) {
    return;
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.warn('\n⚠️  Skipping Vercel Blob cleanup because VERCEL_TOKEN is not set.');
    return;
  }

  try {
    const args = ['storage', 'store', 'rm', store.storeName, '--yes'];
    if (record.vercel?.projectName) {
      args.push('--project', record.vercel.projectName);
    }
    if (record.vercel?.teamId) {
      args.push('--scope', record.vercel.teamId);
    }

    await run('vercel', args, {
      ...process.env,
      VERCEL_TOKEN: token,
    });
    console.log(`🗑️  Removed Vercel Blob store ${store.storeName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to remove Vercel Blob store ${store.storeName}: ${String(error)}`);
  }
}

async function cleanupFiles(projectRoot: string) {
  const toRemove = ['.env.production', '.env.staging', '.env.development'];
  for (const file of toRemove) {
    await fs.rm(path.join(projectRoot, file), { force: true }).catch(() => undefined);
  }
  await fs
    .rm(path.join(projectRoot, '.vercel'), { recursive: true, force: true })
    .catch(() => undefined);
}

async function main() {
  const projectRoot = process.cwd();
  const provisioningPath = path.join(projectRoot, PROVISIONING_FILE);

  if (!(await fileExists(provisioningPath))) {
    console.log('ℹ️  No managed resources metadata found. Nothing to destroy.');
    return;
  }

  const raw = await fs.readFile(provisioningPath, 'utf-8');
  const record = JSON.parse(raw) as CloudProvisioningRecord;

  console.log('🗑️  Destroying managed resources...');

  if (record.mode === 'mock') {
    console.log('   • Detected mock provisioning. Cleaning local artifacts only.');
  } else {
    await deleteVercelBlob(record);
    await deleteVercelProject(record);
    await deleteTurso(record);
  }

  await cleanupFiles(projectRoot);
  await fs.rm(provisioningPath, { force: true }).catch(() => undefined);

  console.log('\n✅ Managed resources destroyed.');
}

main().catch((error) => {
  console.error('\n❌ Failed to destroy managed resources:', error);
  process.exit(1);
});
