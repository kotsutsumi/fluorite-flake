#!/usr/bin/env tsx
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

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

interface CloudflareR2Record {
  bucketName: string;
}

interface SupabaseStorageRecord {
  bucketName: string;
  projectRef?: string;
}

interface AwsS3Record {
  bucketName: string;
  region: string;
}

interface SupabaseDatabaseRecord {
  env: string;
  projectRef: string;
}

interface SupabaseProvisioningRecord {
  databases: SupabaseDatabaseRecord[];
}

interface CloudProvisioningRecord {
  mode: 'mock' | 'real';
  turso?: TursoProvisioningRecord;
  supabase?: SupabaseProvisioningRecord;
  vercel?: VercelProjectRecord;
  vercelBlob?: VercelBlobRecord;
  cloudflareR2?: CloudflareR2Record;
  awsS3?: AwsS3Record;
  supabaseStorage?: SupabaseStorageRecord;
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

  // Check if logged in - turso auth status exits with non-zero when not logged in
  try {
    await run('turso', ['auth', 'status'], process.env);
    // If we got here, we're logged in (command succeeded)
  } catch {
    // Command failed, which means not logged in
    console.warn('\n⚠️  Skipping Turso cleanup because you are not logged in to Turso.');
    console.log('   Run "turso auth login" to log in.');
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
    // Use vercel blob store remove to delete the store
    const args = ['blob', 'store', 'remove', store.storeName];
    if (record.vercel?.teamId) {
      args.push('--scope', record.vercel.teamId);
    }

    await run('vercel', args, process.env);
    console.log(`🗑️  Removed Vercel Blob store ${store.storeName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to remove Vercel Blob store ${store.storeName}: ${String(error)}`);
  }
}

async function deleteCloudflareR2(record: CloudProvisioningRecord) {
  const r2 = record.cloudflareR2;
  if (!r2) {
    return;
  }

  try {
    // Check if wrangler CLI is available
    await run('wrangler', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Cloudflare R2 cleanup because Wrangler CLI is not installed.');
    console.log('   Install it with: npm install -g wrangler');
    return;
  }

  // Check if logged in
  try {
    await run('wrangler', ['whoami'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Cloudflare R2 cleanup because you are not logged in.');
    console.log('   Run "wrangler login" to log in.');
    return;
  }

  try {
    await run('wrangler', ['r2', 'bucket', 'delete', r2.bucketName], process.env);
    console.log(`🗑️  Removed Cloudflare R2 bucket ${r2.bucketName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to delete Cloudflare R2 bucket ${r2.bucketName}: ${String(error)}`);
  }
}

async function deleteSupabaseStorage(record: CloudProvisioningRecord) {
  const storage = record.supabaseStorage;
  if (!storage) {
    return;
  }

  try {
    // Check if supabase CLI is available
    await run('supabase', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Supabase Storage cleanup because Supabase CLI is not installed.');
    return;
  }

  // Note: Supabase storage buckets need to be deleted via the dashboard
  console.log('\n⚠️  Supabase Storage cleanup:');
  console.log(
    `   Storage bucket '${storage.bucketName}' needs to be deleted manually in the Supabase dashboard.`
  );
  if (storage.projectRef) {
    console.log(`   Project: ${storage.projectRef}`);
  }
}

async function deleteAwsS3(record: CloudProvisioningRecord) {
  const s3 = record.awsS3;
  if (!s3) {
    return;
  }

  try {
    // Check if AWS CLI is available
    await run('aws', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping AWS S3 cleanup because AWS CLI is not installed.');
    console.log('   Install it from: https://aws.amazon.com/cli/');
    return;
  }

  // Check if configured
  try {
    await run('aws', ['sts', 'get-caller-identity'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping AWS S3 cleanup because AWS CLI is not configured.');
    console.log('   Run "aws configure" to set up credentials.');
    return;
  }

  try {
    // Force delete the bucket and all its contents
    await run('aws', ['s3', 'rb', `s3://${s3.bucketName}`, '--force'], process.env);
    console.log(`🗑️  Removed AWS S3 bucket ${s3.bucketName}`);
  } catch (error) {
    console.warn(`⚠️  Failed to delete S3 bucket ${s3.bucketName}: ${String(error)}`);
  }
}

async function deleteSupabaseDatabase(record: CloudProvisioningRecord) {
  const supabase = record.supabase;
  if (!supabase || !supabase.databases.length) {
    return;
  }

  try {
    // Check if supabase CLI is available
    await run('supabase', ['--version'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Supabase database cleanup because Supabase CLI is not installed.');
    return;
  }

  // Check if logged in
  try {
    await run('supabase', ['projects', 'list'], process.env);
  } catch {
    console.warn('\n⚠️  Skipping Supabase database cleanup because you are not logged in.');
    console.log('   Run "supabase login" to authenticate.');
    return;
  }

  console.log('\n⚠️  Supabase project cleanup:');
  console.log('   Supabase projects need to be deleted manually via the dashboard.');
  console.log('   Projects to delete:');
  for (const db of supabase.databases) {
    console.log(`   - Project Ref: ${db.projectRef} (Environment: ${db.env})`);
  }
  console.log('   Visit: https://app.supabase.com/projects');
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
    await deleteAwsS3(record);
    await deleteCloudflareR2(record);
    await deleteSupabaseStorage(record);
    await deleteVercelBlob(record);
    await deleteVercelProject(record);
    await deleteTurso(record);
    await deleteSupabaseDatabase(record);
  }

  await cleanupFiles(projectRoot);
  await fs.rm(provisioningPath, { force: true }).catch(() => undefined);

  console.log('\n✅ Managed resources destroyed.');
}

main().catch((error) => {
  console.error('\n❌ Failed to destroy managed resources:', error);
  process.exit(1);
});
