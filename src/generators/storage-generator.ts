// @ts-nocheck
import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate } from '../utils/template-reader.js';

// Simple logger replacement
const _logger = {
    info: (message: string, meta?: unknown) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message: string, meta?: unknown) => console.warn(`[WARN] ${message}`, meta || ''),
    debug: (message: string, meta?: unknown) => console.debug(`[DEBUG] ${message}`, meta || ''),
    error: (message: string, meta?: unknown) => console.error(`[ERROR] ${message}`, meta || ''),
};


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

    await createStorageApiRoutes(config);
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
        `# Vercel Blob Storage\n# Run 'npm run setup:blob' to automatically configure the token\nBLOB_READ_WRITE_TOKEN=""\nBLOB_STORE_ID=""`,
        config.framework
    );

    // Create storage library from template (API-based access)
    const storageContent = await readTemplate('storage/vercel-blob/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Create local storage emulation library
    const localStorageContent = await readTemplate(
        'storage/vercel-blob/lib/storage-local.ts.template'
    );
    const localStoragePath = path.join(config.projectPath, 'src/lib/storage-local.ts');
    await fs.writeFile(localStoragePath, localStorageContent);

    // Create .storage directory for local emulation
    const storageDir = path.join(config.projectPath, '.storage');
    await fs.ensureDir(storageDir);
    await fs.writeFile(path.join(storageDir, '.gitkeep'), '');

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

    // Check Vercel CLI availability and provide guidance
    // TODO: Enable when CLI adapters are fixed
    // await checkVercelStorageAvailability(config);
}


async function setupAwsS3(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# AWS S3\nAWS_REGION="us-east-1"\nAWS_ACCESS_KEY_ID="[your-access-key]"\nAWS_SECRET_ACCESS_KEY="[your-secret-key]"\nS3_BUCKET_NAME="[your-bucket-name]"\nAWS_S3_PUBLIC_URL="https://[your-bucket-name].s3.amazonaws.com"\n`,
        config.framework
    );

    // Create storage library from template
    const storageContent = await readTemplate('storage/aws-s3/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Check AWS CLI availability and provide guidance
    // TODO: Enable when CLI adapters are fixed
    // await checkAwsAvailability(config);
}



async function setupCloudflareR2(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# Cloudflare R2\nR2_ACCOUNT_ID="[your-account-id]"\nR2_ACCESS_KEY_ID="[your-access-key]"\nR2_SECRET_ACCESS_KEY="[your-secret-key]"\nR2_BUCKET_NAME="[your-bucket-name]"\nR2_PUBLIC_URL="https://[your-public-url]"\nR2_CUSTOM_ENDPOINT=""\n`,
        config.framework
    );

    // Create storage library from template
    const storageContent = await readTemplate('storage/cloudflare-r2/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Check Wrangler CLI availability and provide guidance
    // TODO: Enable when CLI adapters are fixed
    // await checkWranglerAvailability(config);
}



async function setupSupabaseStorage(config: ProjectConfig) {
    await appendEnv(
        config.projectPath,
        `\n# Supabase Storage\nNEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"\nSUPABASE_SERVICE_ROLE_KEY="[service-role-key]"\nSUPABASE_STORAGE_BUCKET="uploads"\n`,
        config.framework
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

async function createStorageApiRoutes(config: ProjectConfig) {
    // Create upload route from template
    const uploadRouteContent = await readTemplate('storage/common/api/upload-route.ts.template');
    const uploadRouteDir = path.join(config.projectPath, 'src/app/api/upload');
    await fs.ensureDir(uploadRouteDir);
    await fs.writeFile(path.join(uploadRouteDir, 'route.ts'), uploadRouteContent);

    // Create storage catch-all route for API access
    const catchAllContent = await readTemplate('storage/common/api/storage-catch-all.ts.template');
    const catchAllDir = path.join(config.projectPath, 'src/app/api/storage/[...path]');
    await fs.ensureDir(catchAllDir);
    await fs.writeFile(path.join(catchAllDir, 'route.ts'), catchAllContent);

    // Create storage debug route for development
    const debugContent = await readTemplate('storage/common/api/storage-debug.ts.template');
    const debugDir = path.join(config.projectPath, 'src/app/api/storage/debug');
    await fs.ensureDir(debugDir);
    await fs.writeFile(path.join(debugDir, 'route.ts'), debugContent);
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

const ENV_TARGET_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.staging',
    '.env.production',
    '.env.prod',
];

async function appendEnv(projectPath: string, content: string, framework?: string) {
    // For Next.js, append to all environment files that exist
    if (framework === 'nextjs') {
        for (const file of ENV_TARGET_FILES) {
            const envPath = path.join(projectPath, file);
            // Only append if file exists
            if (await fs.pathExists(envPath)) {
                await fs.appendFile(envPath, `\n${content}`);
            }
        }
    } else {
        // For other frameworks, maintain original behavior - create .env.local if needed
        const envPath = path.join(projectPath, '.env.local');
        await fs.appendFile(envPath, content);

        // Also append to .env.development if it exists (for frameworks that use it)
        const envDevPath = path.join(projectPath, '.env.development');
        if (await fs.pathExists(envDevPath)) {
            await fs.appendFile(envDevPath, content);
        }
    }
}
