import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate } from '../utils/template-reader.js';

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
    // Create the setup script from template
    const setupBlobScript = await readTemplate(
        'storage/vercel-blob/scripts/setup-blob.sh.template'
    );

    // Write the setup script
    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'setup-vercel-blob.sh'), setupBlobScript, {
        mode: 0o755,
    });

    // Add a minimal placeholder to .env.local
    await appendEnv(
        config.projectPath,
        `\n# Vercel Blob Storage\n# Run 'npm run setup:blob' to automatically configure the token\nBLOB_READ_WRITE_TOKEN=""\n`
    );

    // Create storage library from template
    const storageContent = await readTemplate('storage/vercel-blob/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Add setup script to package.json
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'setup:blob': 'bash scripts/setup-vercel-blob.sh',
        'setup:storage': 'bash scripts/setup-vercel-blob.sh',
        'check:blob': 'tsx scripts/check-blob-config.ts',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // Create the check blob config script from template
    const checkBlobScript = await readTemplate(
        'storage/vercel-blob/scripts/check-blob-config.ts.template'
    );
    await fs.writeFile(
        path.join(config.projectPath, 'scripts', 'check-blob-config.ts'),
        checkBlobScript
    );
}

async function setupAwsS3(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# AWS S3\nAWS_REGION="us-east-1"\nAWS_ACCESS_KEY_ID="[your-access-key]"\nAWS_SECRET_ACCESS_KEY="[your-secret-key]"\nS3_BUCKET_NAME="[your-bucket-name]"\nAWS_S3_PUBLIC_URL="https://[your-bucket-name].s3.amazonaws.com"\n`
    );

    // Create storage library from template
    const storageContent = await readTemplate('storage/aws-s3/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);
}

async function setupCloudflareR2(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# Cloudflare R2\nR2_ACCOUNT_ID="[your-account-id]"\nR2_ACCESS_KEY_ID="[your-access-key]"\nR2_SECRET_ACCESS_KEY="[your-secret-key]"\nR2_BUCKET_NAME="[your-bucket-name]"\nR2_PUBLIC_URL="https://[your-public-url]"\nR2_CUSTOM_ENDPOINT=""\n`
    );

    // Create storage library from template
    const storageContent = await readTemplate('storage/cloudflare-r2/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);
}

async function setupSupabaseStorage(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# Supabase Storage\nNEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"\nSUPABASE_SERVICE_ROLE_KEY="[service-role-key]"\nSUPABASE_STORAGE_BUCKET="uploads"\n`
    );

    await ensureSupabaseClient(config);

    // Create storage library from template
    const storageContent = await readTemplate('storage/supabase/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);
}

async function ensureSupabaseClient(config: ProjectConfig) {
    const supabasePath = path.join(config.projectPath, 'src/lib/supabase.ts');
    if (await fs.pathExists(supabasePath)) {
        return;
    }

    // Create Supabase client from template
    const clientContent = await readTemplate('storage/supabase/lib/client.ts.template');
    await fs.ensureDir(path.dirname(supabasePath));
    await fs.writeFile(supabasePath, clientContent);
}

async function createUploadRoute(config: ProjectConfig) {
    // Create upload route from template
    const routeContent = await readTemplate('storage/common/api/upload-route.ts.template');
    const routeDir = path.join(config.projectPath, 'src/app/api/upload');
    await fs.ensureDir(routeDir);
    await fs.writeFile(path.join(routeDir, 'route.ts'), routeContent);
}

async function createUploadComponent(config: ProjectConfig) {
    // Create upload component from template
    const componentContent = await readTemplate(
        'storage/common/components/file-upload.tsx.template'
    );
    const componentPath = path.join(config.projectPath, 'src/components/file-upload.tsx');
    await fs.ensureDir(path.dirname(componentPath));
    await fs.writeFile(componentPath, componentContent);
}

async function writeStorageLib(config: ProjectConfig, contents: string) {
    const storagePath = path.join(config.projectPath, 'src/lib/storage.ts');
    await fs.ensureDir(path.dirname(storagePath));
    await fs.writeFile(storagePath, contents);
}

async function appendEnv(projectPath: string, content: string) {
    const envPath = path.join(projectPath, '.env.local');
    const envDevPath = path.join(projectPath, '.env.development');

    // Append to .env.local if it exists or create it
    await fs.appendFile(envPath, content);

    // If we have a .env.development file as well, append there too
    if (await fs.pathExists(envDevPath)) {
        await fs.appendFile(envDevPath, content);
    }
}
