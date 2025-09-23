import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function setupStorage(config: ProjectConfig) {
  if (config.storage === 'none') {
    return;
  }

  switch (config.storage) {
    case 'vercel-blob':
      await setupVercelBlob(config);
      break;
    case 'aws-s3':
      await setupAwsS3(config);
      break;
    case 'cloudflare-r2':
      await setupCloudflareR2(config);
      break;
    case 'supabase-storage':
      await setupSupabaseStorage(config);
      break;
    default:
      break;
  }

  await createUploadRoute(config);
  await createUploadComponent(config);
}

async function setupVercelBlob(config: ProjectConfig) {
  await appendEnv(
    config.projectPath,
    `\n# Vercel Blob Storage\nBLOB_READ_WRITE_TOKEN="[your-blob-token]"\n`
  );

  const storageContent = `import { put, del, list } from '@vercel/blob';

export async function uploadBuffer(buffer: Buffer, filename: string, contentType?: string) {
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType,
  });

  return blob.url;
}

export async function deleteFile(url: string) {
  await del(url);
}

export async function listFiles(options?: { limit?: number; prefix?: string }) {
  const { blobs } = await list(options);
  return blobs;
}
`;

  await writeStorageLib(config, storageContent);
}

async function setupAwsS3(config: ProjectConfig) {
  await appendEnv(
    config.projectPath,
    `\n# AWS S3\nAWS_REGION="us-east-1"\nAWS_ACCESS_KEY_ID="[your-access-key]"\nAWS_SECRET_ACCESS_KEY="[your-secret-key]"\nS3_BUCKET_NAME="[your-bucket-name]"\nAWS_S3_PUBLIC_URL="https://[your-bucket-name].s3.amazonaws.com"\n`
  );

  const storageContent = `import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadBuffer(buffer: Buffer, filename: string, contentType?: string) {
  const bucket = process.env.S3_BUCKET_NAME!;
  const key = 'uploads/' + Date.now() + '-' + filename;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl =
    process.env.AWS_S3_PUBLIC_URL ??
    'https://' + bucket + '.s3.' + process.env.AWS_REGION + '.amazonaws.com';

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return normalizedBase + '/' + key;
}
`;

  await writeStorageLib(config, storageContent);
}

async function setupCloudflareR2(config: ProjectConfig) {
  await appendEnv(
    config.projectPath,
    `\n# Cloudflare R2\nR2_ACCOUNT_ID="[account-id]"\nR2_ACCESS_KEY_ID="[access-key]"\nR2_SECRET_ACCESS_KEY="[secret-key]"\nR2_BUCKET_NAME="[bucket-name]"\nR2_PUBLIC_URL="https://assets.example.com"\n`
  );

  const storageContent = `import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const endpoint = process.env.R2_CUSTOM_ENDPOINT
  ? process.env.R2_CUSTOM_ENDPOINT
  : 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';

const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadBuffer(buffer: Buffer, filename: string, contentType?: string) {
  const bucket = process.env.R2_BUCKET_NAME!;
  const key = 'uploads/' + Date.now() + '-' + filename;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const endpointBase = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const baseUrl =
    process.env.R2_PUBLIC_URL ?? endpointBase + '/' + bucket;

  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return normalizedBase + '/' + key;
}
`;

  await writeStorageLib(config, storageContent);
}

async function setupSupabaseStorage(config: ProjectConfig) {
  await appendEnv(
    config.projectPath,
    `\n# Supabase Storage\nNEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"\nSUPABASE_SERVICE_ROLE_KEY="[service-role-key]"\nSUPABASE_STORAGE_BUCKET="uploads"\n`
  );

  await ensureSupabaseClient(config);

  const storageContent = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';

const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function uploadBuffer(buffer: Buffer, filename: string, contentType?: string) {
  const objectKey = 'uploads/' + Date.now() + '-' + filename;

  const uploadResult = await supabase.storage.from(bucket).upload(objectKey, buffer, {
    contentType,
    upsert: true,
  });

  if (uploadResult.error) {
    throw uploadResult.error;
  }

  const signedUrl = await supabase.storage.from(bucket).createSignedUrl(objectKey, 60 * 60);

  if (signedUrl.error) {
    throw signedUrl.error;
  }

  return signedUrl.data?.signedUrl ?? '';
}
`;

  await writeStorageLib(config, storageContent);
}

async function ensureSupabaseClient(config: ProjectConfig) {
  const supabasePath = path.join(config.projectPath, 'src/lib/supabase.ts');
  if (await fs.pathExists(supabasePath)) {
    return;
  }

  const clientContent = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;

  await fs.ensureDir(path.dirname(supabasePath));
  await fs.writeFile(supabasePath, clientContent);
}

async function createUploadRoute(config: ProjectConfig) {
  const routeContent = `import { Buffer } from 'node:buffer';
import { NextRequest, NextResponse } from 'next/server';
import { uploadBuffer } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadBuffer(buffer, file.name, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload failed', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
`;

  const routeDir = path.join(config.projectPath, 'src/app/api/upload');
  await fs.ensureDir(routeDir);
  await fs.writeFile(path.join(routeDir, 'route.ts'), routeContent);
}

async function createUploadComponent(config: ProjectConfig) {
  const componentContent = `'use client';

import type { ChangeEvent } from 'react';
import { useState } from 'react';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedUrl(data.url);
    } catch (err) {
      console.error(err);
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {uploadedUrl && (
        <p className="text-sm break-all">
          Uploaded to:{' '}
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {uploadedUrl}
          </a>
        </p>
      )}
    </div>
  );
}
`;

  const componentPath = path.join(config.projectPath, 'src/components/file-upload.tsx');
  await fs.ensureDir(path.dirname(componentPath));
  await fs.writeFile(componentPath, componentContent);
}

async function writeStorageLib(config: ProjectConfig, contents: string) {
  const storagePath = path.join(config.projectPath, 'src/lib/storage.ts');
  await fs.ensureDir(path.dirname(storagePath));
  await fs.writeFile(storagePath, contents);
}

async function appendEnv(projectPath: string, snippet: string) {
  const envPath = path.join(projectPath, '.env.local');
  const existing = await fs.readFile(envPath, 'utf-8').catch(() => '');
  const separator = existing.endsWith('\n') || existing.length === 0 ? '' : '\n';
  await fs.writeFile(envPath, `${existing}${separator}${snippet}`);
}
