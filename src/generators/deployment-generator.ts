import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function setupDeployment(config: ProjectConfig) {
  // Create Vercel configuration
  await createVercelConfig(config);

  // Add deployment scripts
  await addDeploymentScripts(config);

  // Create deployment script
  await createDeploymentScript(config);

  // Setup Vercel Blob if needed
  if (config.database !== 'none') {
    await setupVercelBlob(config);
  }
}

async function createVercelConfig(config: ProjectConfig) {
  const vercelConfig: {
    buildCommand: string;
    devCommand: string;
    installCommand: string;
    framework: string;
    outputDirectory: string;
    env: Record<string, string>;
  } = {
    buildCommand: `${config.packageManager} run build`,
    devCommand: `${config.packageManager} run dev`,
    installCommand: `${config.packageManager} install`,
    framework: 'nextjs',
    outputDirectory: '.next',
    env: {
      NODE_ENV: 'production',
    },
  };

  // Add database environment variables
  if (config.database === 'turso') {
    vercelConfig.env = {
      ...vercelConfig.env,
      TURSO_DATABASE_URL: '@turso_database_url',
      TURSO_AUTH_TOKEN: '@turso_auth_token',
      DATABASE_URL: '@database_url',
    };
  } else if (config.database === 'supabase') {
    vercelConfig.env = {
      ...vercelConfig.env,
      NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_anon_key',
      SUPABASE_SERVICE_ROLE_KEY: '@supabase_service_role_key',
      DATABASE_URL: '@database_url',
    };
  }

  await fs.writeJSON(path.join(config.projectPath, 'vercel.json'), vercelConfig, { spaces: 2 });
}

async function addDeploymentScripts(config: ProjectConfig) {
  const packageJsonPath = path.join(config.projectPath, 'package.json');
  const packageJson = await fs.readJSON(packageJsonPath);

  const deployScripts = {
    deploy: 'vercel',
    'deploy:prod': 'vercel --prod',
    'deploy:preview': 'vercel --preview',
    'deploy:destroy': 'bash scripts/destroy-deployment.sh',
  };

  packageJson.scripts = {
    ...packageJson.scripts,
    ...deployScripts,
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

async function createDeploymentScript(config: ProjectConfig) {
  const deployScriptContent = `#!/usr/bin/env bash
set -e

echo "🚀 Setting up Vercel deployment..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Login to Vercel
echo "📝 Logging in to Vercel..."
vercel login

# Link to Vercel project
echo "🔗 Linking to Vercel project..."
vercel link --yes

# Set environment variables
echo "🔐 Setting environment variables..."

${
  config.database === 'turso'
    ? `
# Turso environment variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add DATABASE_URL
`
    : ''
}

${
  config.database === 'supabase'
    ? `
# Supabase environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
`
    : ''
}

${
  config.database !== 'none' && config.orm === 'prisma'
    ? `
# Run database migrations
echo "🗄️ Running database migrations..."
${config.packageManager} run db:migrate:prod
`
    : ''
}

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
`;

  const scriptPath = path.join(config.projectPath, 'scripts', 'deploy.sh');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, deployScriptContent);
  await fs.chmod(scriptPath, '755');

  // Create destroy deployment script
  const destroyScriptContent = `#!/usr/bin/env bash
set -e

echo "🗑️ Destroying Vercel deployment..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found."
    exit 1
fi

# Remove Vercel project
echo "🔥 Removing Vercel project..."
vercel remove --yes

${
  config.database === 'turso'
    ? `
# Remove Turso database
if command -v turso &> /dev/null; then
    echo "🗄️ Removing Turso database..."
    DB_NAME="${config.projectName.replace(/-/g, '_')}_db"
    turso db destroy $DB_NAME --yes || true
fi
`
    : ''
}

${
  config.database === 'supabase'
    ? `
# Stop local Supabase
if command -v supabase &> /dev/null; then
    echo "🗄️ Stopping local Supabase..."
    supabase stop || true
fi
`
    : ''
}

echo "✅ Deployment destroyed!"
`;

  const destroyScriptPath = path.join(config.projectPath, 'scripts', 'destroy-deployment.sh');
  await fs.writeFile(destroyScriptPath, destroyScriptContent);
  await fs.chmod(destroyScriptPath, '755');
}

async function setupVercelBlob(config: ProjectConfig) {
  // Add Vercel Blob environment variables
  const envContent = `
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="[your-blob-token]"
`;

  const envPath = path.join(config.projectPath, '.env.local');
  const existingEnv = await fs.readFile(envPath, 'utf-8').catch(() => '');
  await fs.writeFile(envPath, existingEnv + envContent);

  // Create blob utility
  const blobUtilContent = `import { put, del, list } from '@vercel/blob';

export async function uploadFile(file: File, pathname?: string) {
  const blob = await put(pathname || file.name, file, {
    access: 'public',
  });

  return blob;
}

export async function deleteFile(url: string) {
  await del(url);
}

export async function listFiles(options?: { limit?: number; prefix?: string }) {
  const { blobs } = await list(options);
  return blobs;
}

export async function uploadFromBuffer(
  buffer: Buffer,
  filename: string,
  contentType?: string
) {
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType,
  });

  return blob;
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/lib/blob.ts'), blobUtilContent);

  // Create file upload API route
  const uploadRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const blob = await put(file.name, file, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
`;

  await fs.ensureDir(path.join(config.projectPath, 'src/app/api/upload'));
  await fs.writeFile(
    path.join(config.projectPath, 'src/app/api/upload/route.ts'),
    uploadRouteContent
  );

  // Create file upload component
  const uploadComponentContent = `'use client';

import { useState } from 'react';
import { uploadFile } from '@/lib/blob';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const blob = await response.json();
      setUploadedUrl(blob.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        className="mb-2"
      />
      {uploading && <p>Uploading...</p>}
      {uploadedUrl && (
        <div>
          <p className="text-sm text-gray-600">Uploaded to:</p>
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline text-sm break-all"
          >
            {uploadedUrl}
          </a>
        </div>
      )}
    </div>
  );
}
`;

  await fs.writeFile(
    path.join(config.projectPath, 'src/components/file-upload.tsx'),
    uploadComponentContent
  );
}
