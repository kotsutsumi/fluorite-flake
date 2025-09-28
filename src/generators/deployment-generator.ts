// @ts-nocheck
import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate, readTemplateWithReplacements } from '../utils/template-reader.js';

export async function setupDeployment(config: ProjectConfig) {
    // Flutter has its own deployment configuration
    if (config.framework === 'flutter') {
        return;
    }

    // Create Vercel configuration
    await createVercelConfig(config);

    // Add deployment scripts
    await addDeploymentScripts(config);

    // Create comprehensive deployment scripts
    await createDeploymentScripts(config);

    // Create Vercel deployment automation script
    if (config.database === 'turso' || config.database === 'supabase') {
        await createVercelAutomationScript(config);
    }

    // Check Vercel CLI availability and optionally link project
    // TODO: Enable when CLI adapters are fixed
}

async function createVercelConfig(config: ProjectConfig) {
    const vercelConfig: {
        buildCommand: string;
        devCommand: string;
        installCommand: string;
        framework: string;
        outputDirectory: string;
        env: Record<string, string>;
        envFilesystem: string[];
        functions?: Record<string, unknown>;
    } = {
        buildCommand: `${config.packageManager} run build`,
        devCommand: `${config.packageManager} run dev`,
        installCommand: `${config.packageManager} install`,
        framework: 'nextjs',
        outputDirectory: '.next',
        env: {
            NODE_ENV: 'production',
        },
        envFilesystem: ['.env.production', '.env.staging', '.env.development'],
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

    // Add storage environment variables
    vercelConfig.env = {
        ...vercelConfig.env,
        ...getStorageEnvPlaceholders(config.storage),
    };

    await fs.writeJSON(path.join(config.projectPath, 'vercel.json'), vercelConfig, { spaces: 2 });
}

async function addDeploymentScripts(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    const deployScripts: Record<string, string> = {
        // Basic deployment commands
        deploy: 'vercel',
        'deploy:prod': 'vercel --prod',
        'deploy:staging': 'vercel --preview',
        'deploy:dev': 'vercel --preview',
        'deploy:destroy': 'tsx scripts/destroy-deployment.ts',

        // Automated deployment with environment setup
        'deploy:setup': 'bash scripts/setup-deployment.sh',
        'deploy:setup:prod': 'bash scripts/setup-deployment.sh prod',
        'deploy:setup:staging': 'bash scripts/setup-deployment.sh staging',
        'deploy:setup:dev': 'bash scripts/setup-deployment.sh dev',

        // Environment management
        'env:pull': 'vercel env pull',
        'env:pull:prod': 'vercel env pull --environment=production',
        'env:pull:staging': 'vercel env pull --environment=preview --git-branch=staging',
        'env:pull:dev': 'vercel env pull --environment=preview --git-branch=development',
    };

    // Add database-specific deployment scripts
    if (config.database === 'turso') {
        deployScripts['deploy:full'] =
            'bash scripts/setup-turso.sh --cloud && bash scripts/setup-deployment.sh';
    }

    packageJson.scripts = {
        ...packageJson.scripts,
        ...deployScripts,
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

function getStorageEnvPlaceholders(storage: ProjectConfig['storage']): Record<string, string> {
    switch (storage) {
        case 'vercel-blob':
            return {
                BLOB_READ_WRITE_TOKEN: '@blob_read_write_token',
            };
        case 'aws-s3':
            return {
                AWS_REGION: '@aws_region',
                AWS_ACCESS_KEY_ID: '@aws_access_key_id',
                AWS_SECRET_ACCESS_KEY: '@aws_secret_access_key',
                S3_BUCKET_NAME: '@s3_bucket_name',
            };
        case 'cloudflare-r2':
            return {
                R2_ACCOUNT_ID: '@r2_account_id',
                R2_ACCESS_KEY_ID: '@r2_access_key_id',
                R2_SECRET_ACCESS_KEY: '@r2_secret_access_key',
                R2_BUCKET_NAME: '@r2_bucket_name',
                R2_PUBLIC_URL: '@r2_public_url',
            };
        case 'supabase-storage':
            return {
                NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_anon_key',
                SUPABASE_SERVICE_ROLE_KEY: '@supabase_service_role_key',
                SUPABASE_STORAGE_BUCKET: '@supabase_storage_bucket',
            };
        default:
            return {};
    }
}

async function createDeploymentScripts(config: ProjectConfig) {
    await createSetupDeploymentScript(config);
    await createDestroyDeploymentScript(config);
}

async function createSetupDeploymentScript(config: ProjectConfig) {
    // Build blob storage setup section
    let blobStorageSetup = '';
    if (config.storage === 'vercel-blob') {
        blobStorageSetup = `# Setup Vercel Blob Storage automatically
if [ ! -f ".env.local" ] || ! grep -q "BLOB_READ_WRITE_TOKEN=" .env.local || [ -z "$(grep BLOB_READ_WRITE_TOKEN= .env.local | cut -d'=' -f2)" ]; then
    echo ""
    echo "🔑 Setting up Vercel Blob Storage..."
    if [ -f "scripts/setup-vercel-blob.sh" ]; then
        bash scripts/setup-vercel-blob.sh

        # After setup, read the token from .env.local
        if [ -f ".env.local" ]; then
            BLOB_TOKEN=$(grep BLOB_READ_WRITE_TOKEN .env.local | cut -d'=' -f2)
            if [ -n "$BLOB_TOKEN" ]; then
                echo "   Adding BLOB_READ_WRITE_TOKEN to Vercel environment..."
                echo "$BLOB_TOKEN" | vercel env add BLOB_READ_WRITE_TOKEN $ENV_FLAG --yes 2>/dev/null || true
            fi
        fi
    fi
fi
`;
    }

    // Build database migrations section
    let databaseMigrations = '';
    if (config.database !== 'none' && config.orm === 'prisma') {
        databaseMigrations = `
# Run database migrations for production
if [ "$ENV" == "prod" ] || [ "$ENV" == "production" ]; then
    echo "🗄️ Running database migrations..."
    ${config.packageManager} run db:migrate:prod || echo "Migration will run during build"
fi
`;
    }

    const deployScriptContent = await readTemplateWithReplacements(
        'deployment/scripts/setup-deployment.sh.template',
        {
            projectName: config.projectName,
            packageManager: config.packageManager,
            blobStorageSetup,
            databaseMigrations,
        }
    );

    const scriptPath = path.join(config.projectPath, 'scripts', 'setup-deployment.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, deployScriptContent);
    await fs.chmod(scriptPath, '755');
}

async function createDestroyDeploymentScript(config: ProjectConfig) {
    const content = await readTemplate('scripts/destroy-deployment.ts.template');
    const scriptPath = path.join(config.projectPath, 'scripts', 'destroy-deployment.ts');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, content);
}

async function createVercelAutomationScript(config: ProjectConfig) {
    // Build Turso setup section
    let tursoSetup = '';
    if (config.database === 'turso') {
        tursoSetup = `
# Step 1: Set up Turso Cloud databases
echo ""
echo "📦 Step 1: Setting up Turso Cloud databases..."
bash scripts/setup-turso.sh --cloud

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up Turso databases"
    exit 1
fi
`;
    }

    const databaseType = config.database === 'turso' ? 'Turso' : 'Supabase';

    const automationScriptContent = await readTemplateWithReplacements(
        'deployment/scripts/automated-deployment.sh.template',
        {
            projectName: config.projectName,
            databaseType,
            packageManager: config.packageManager,
            tursoSetup,
        }
    );

    const scriptPath = path.join(config.projectPath, 'scripts', 'automated-deployment.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, automationScriptContent);
    await fs.chmod(scriptPath, '755');

    // Also update package.json with the automated deployment script
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    packageJson.scripts = {
        ...packageJson.scripts,
        'deploy:auto': 'bash scripts/automated-deployment.sh',
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
