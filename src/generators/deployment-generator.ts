import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function setupDeployment(config: ProjectConfig) {
  // Flutter has its own deployment configuration, skip JavaScript-specific setup
  if (config.framework === 'flutter') {
    // Flutter deployment is handled through platform-specific configurations
    // (Android Gradle, iOS Xcode, etc.) which are already set up in the Flutter generator
    return;
  }

  // Create Vercel configuration
  await createVercelConfig(config);

  // Add deployment scripts
  await addDeploymentScripts(config);

  // Create deployment script
  await createDeploymentScript(config);
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

  vercelConfig.env = {
    ...vercelConfig.env,
    ...getStorageEnvPlaceholders(config.storage),
  };

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

function getStorageEnvVars(storage: ProjectConfig['storage']): string[] {
  return Object.keys(getStorageEnvPlaceholders(storage));
}

async function createDeploymentScript(config: ProjectConfig) {
  const envVars = new Set<string>(getStorageEnvVars(config.storage));

  if (config.database === 'turso') {
    envVars.add('TURSO_DATABASE_URL');
    envVars.add('TURSO_AUTH_TOKEN');
    envVars.add('DATABASE_URL');
  } else if (config.database === 'supabase') {
    envVars.add('NEXT_PUBLIC_SUPABASE_URL');
    envVars.add('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    envVars.add('SUPABASE_SERVICE_ROLE_KEY');
    envVars.add('DATABASE_URL');
  }

  const envCommands = Array.from(envVars)
    .map((envVar) => `vercel env add ${envVar}`)
    .join('\n');

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
  envCommands
    ? `${envCommands}
`
    : ''
}${
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
