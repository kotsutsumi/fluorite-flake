import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

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
    'env:pull:staging': 'vercel env pull --environment=preview',
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
  const deployScriptContent = `#!/usr/bin/env bash
set -e

PROJECT_NAME="${config.projectName}"
ENV=\${1:-"prod"}

echo "🚀 Setting up Vercel deployment for $PROJECT_NAME (\$ENV environment)..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Login to Vercel (if not already logged in)
echo "📝 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "Logging in to Vercel..."
    vercel login
fi

# Link to Vercel project
if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Linking to Vercel project..."
    vercel link --yes
else
    echo "✅ Already linked to Vercel project"
fi

# Set environment-specific variables
echo "🔐 Setting environment variables for \$ENV..."

if [ "\$ENV" == "prod" ] || [ "\$ENV" == "production" ]; then
    ENV_FILE=".env.production"
    ENV_FLAG="--environment=production"
    ENV_NAME="production"
elif [ "\$ENV" == "stg" ] || [ "\$ENV" == "staging" ]; then
    ENV_FILE=".env.staging"
    ENV_FLAG="--environment=preview"
    ENV_NAME="staging"
elif [ "\$ENV" == "dev" ] || [ "\$ENV" == "development" ]; then
    ENV_FILE=".env.development"
    ENV_FLAG="--environment=preview"
    ENV_NAME="development"
else
    echo "❌ Invalid environment. Use: prod, staging, or dev"
    exit 1
fi

# Load environment variables from file and set them in Vercel
if [ -f "\$ENV_FILE" ]; then
    echo "📄 Loading environment variables from \$ENV_FILE..."

    # Read each line from the env file
    while IFS= read -r line; do
        # Skip comments and empty lines
        if [[ ! "\$line" =~ ^# ]] && [[ -n "\$line" ]]; then
            # Extract key and value
            KEY=\$(echo "\$line" | cut -d '=' -f 1)
            VALUE=\$(echo "\$line" | cut -d '=' -f 2- | sed 's/^"//' | sed 's/"$//')

            # Set the environment variable in Vercel
            echo "   Setting \$KEY..."
            echo "\$VALUE" | vercel env add \$KEY \$ENV_FLAG --yes 2>/dev/null || true
        fi
    done < "\$ENV_FILE"

    echo "✅ Environment variables set for \$ENV_NAME"
else
    echo "⚠️ No environment file found at \$ENV_FILE"
fi

${
  config.database !== 'none' && config.orm === 'prisma'
    ? `
# Run database migrations for production
if [ "\$ENV" == "prod" ] || [ "\$ENV" == "production" ]; then
    echo "🗄️ Running database migrations..."
    ${config.packageManager} run db:migrate:prod || echo "Migration will run during build"
fi
`
    : ''
}

# Deploy to Vercel
echo "🚀 Deploying to Vercel (\$ENV_NAME)..."

if [ "\$ENV" == "prod" ] || [ "\$ENV" == "production" ]; then
    vercel --prod
else
    DEPLOYMENT_URL=\$(vercel --preview)
    echo ""
    echo "✅ Deployment complete!"
    echo "🔗 Preview URL: \$DEPLOYMENT_URL"

    # Create alias for staging/dev environments
    if [ "\$ENV" == "stg" ] || [ "\$ENV" == "staging" ]; then
        ALIAS="\${PROJECT_NAME}-staging.vercel.app"
        vercel alias \$DEPLOYMENT_URL \$ALIAS
        echo "🔗 Staging alias: https://\$ALIAS"
    elif [ "\$ENV" == "dev" ] || [ "\$ENV" == "development" ]; then
        ALIAS="\${PROJECT_NAME}-dev.vercel.app"
        vercel alias \$DEPLOYMENT_URL \$ALIAS
        echo "🔗 Development alias: https://\$ALIAS"
    fi
fi

echo ""
echo "✅ Deployment setup complete for \$ENV_NAME!"
echo ""
echo "📚 Next steps:"
echo "   - Visit your deployment URL to see the app"
echo "   - Run '${config.packageManager} run deploy:\$ENV' for future deployments"
echo "   - Run '${config.packageManager} run deploy:destroy' to remove everything"
`;

  const scriptPath = path.join(config.projectPath, 'scripts', 'setup-deployment.sh');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, deployScriptContent);
  await fs.chmod(scriptPath, '755');
}

async function createDestroyDeploymentScript(config: ProjectConfig) {
  const templatePath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    '../../templates/scripts/destroy-deployment.ts'
  );
  const scriptPath = path.join(config.projectPath, 'scripts', 'destroy-deployment.ts');
  const content = await fs.readFile(templatePath, 'utf-8');
  await fs.ensureDir(path.dirname(scriptPath));
  await fs.writeFile(scriptPath, content);
}

async function createVercelAutomationScript(config: ProjectConfig) {
  const automationScriptContent = `#!/usr/bin/env bash
set -e

PROJECT_NAME="${config.projectName}"
PROJECT_NAME_CLEAN=\$(echo "\$PROJECT_NAME" | tr '-' '_')

echo "🎯 Automated Vercel + ${config.database === 'turso' ? 'Turso' : 'Supabase'} deployment setup..."
echo ""
echo "This script will:"
echo "  1. Create cloud databases (prod, stg, dev)"
echo "  2. Set up Vercel project with environments"
echo "  3. Configure all environment variables"
echo "  4. Deploy to all environments"
echo ""
read -p "Continue? (Y/n) " -n 1 -r
echo ""

if [[ \$REPLY =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

${
  config.database === 'turso'
    ? `
# Step 1: Set up Turso Cloud databases
echo ""
echo "📦 Step 1: Setting up Turso Cloud databases..."
bash scripts/setup-turso.sh --cloud

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up Turso databases"
    exit 1
fi
`
    : ''
}

# Step 2: Set up Vercel project
echo ""
echo "🔗 Step 2: Linking Vercel project..."

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Login to Vercel
if ! vercel whoami &> /dev/null; then
    echo "Logging in to Vercel..."
    vercel login
fi

# Link project
vercel link --yes

# Step 3: Deploy to all environments
echo ""
echo "🚀 Step 3: Deploying to all environments..."

# Deploy to development
echo ""
echo "📌 Deploying to development environment..."
bash scripts/setup-deployment.sh dev

# Deploy to staging
echo ""
echo "📌 Deploying to staging environment..."
bash scripts/setup-deployment.sh staging

# Deploy to production
echo ""
echo "📌 Deploying to production environment..."
bash scripts/setup-deployment.sh prod

echo ""
echo "🎉 Automated deployment complete!"
echo ""
echo "📊 Your deployments:"
echo "   Production: https://\${PROJECT_NAME}.vercel.app"
echo "   Staging: https://\${PROJECT_NAME}-staging.vercel.app"
echo "   Development: https://\${PROJECT_NAME}-dev.vercel.app"
echo ""
echo "📚 Management commands:"
echo "   ${config.packageManager} run deploy:prod     - Deploy to production"
echo "   ${config.packageManager} run deploy:staging  - Deploy to staging"
echo "   ${config.packageManager} run deploy:dev      - Deploy to development"
echo "   ${config.packageManager} run deploy:destroy  - Remove everything"
`;

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
