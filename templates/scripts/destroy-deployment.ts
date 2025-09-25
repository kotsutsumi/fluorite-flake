#!/usr/bin/env tsx
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

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

  try {
    // Check if turso CLI is available
    await run('turso', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Turso cleanup because Turso CLI is not installed.');
    return;
  }

  // Check if logged in
  try {
    const authStatus = await run('turso', ['auth', 'status'], process.env);
    if (!authStatus.includes('Logged in')) {
      console.warn('\n⚠️  Skipping Turso cleanup because you are not logged in to Turso.');
      console.log('   Run "turso auth login" to log in.');
      return;
    }
  } catch {
    console.warn('\n⚠️  Skipping Turso cleanup - could not check auth status.');
    return;
  }

  for (const database of turso.databases) {
    try {
      await run('turso', ['db', 'destroy', database.name, '--yes'], process.env);
      console.log(`🗑️  Removed Turso database ${database.name}`);
    } catch (error) {
      console.warn(`⚠️  Failed to delete Turso database ${database.name}: ${String(error)}`);
    }
  }
}

async function deleteVercelProject(record: CloudProvisioningRecord) {
  const project = record.vercel;
  if (!project) {
    return;
  }

  try {
    // Check if vercel CLI is available
    await run('vercel', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Vercel project removal because Vercel CLI is not installed.');
    return;
  }

  // Check if logged in
  try {
    const whoami = await run('vercel', ['whoami'], process.env);
    if (!whoami || whoami.includes('Error')) {
      console.warn('\n⚠️  Skipping Vercel cleanup because you are not logged in to Vercel.');
      console.log('   Run "vercel login" to log in.');
      return;
    }
  } catch {
    console.warn('\n⚠️  Skipping Vercel cleanup - could not check auth status.');
    return;
  }

  try {
    const args = ['remove', project.projectName, '--yes'];
    if (project.teamId) {
      args.push('--scope', project.teamId);
    }

    await run('vercel', args, process.env);
    console.log(`🗑️  Removed Vercel project ${project.projectName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to delete Vercel project ${project.projectName}: ${String(error)}`);
  }
}

async function deleteVercelBlob(record: CloudProvisioningRecord) {
  const store = record.vercelBlob;
  if (!store) {
    return;
  }

  try {
    // Check if vercel CLI is available
    await run('vercel', ['--version'], process.env);
  } catch {
    // CLI not available, already warned in project deletion
    return;
  }

  try {
    const args = ['storage', 'rm', store.storeName, '--yes'];
    if (record.vercel?.projectName) {
      args.push('--project', record.vercel.projectName);
    }
    if (record.vercel?.teamId) {
      args.push('--scope', record.vercel.teamId);
    }

    await run('vercel', args, process.env);
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
