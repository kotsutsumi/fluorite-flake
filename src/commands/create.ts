import path from 'node:path';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import ora from 'ora';
import prompts from 'prompts';
import { setupAuth } from '../generators/auth-generator.js';
import { setupDatabase } from '../generators/database-generator.js';
import { setupDeployment } from '../generators/deployment-generator.js';
import { generateExpoProject } from '../generators/expo-generator.js';
import { generateFlutterProject } from '../generators/flutter-generator.js';
import { generateNextProject } from '../generators/next-generator.js';
import { setupStorage } from '../generators/storage-generator.js';
import { generateTauriProject } from '../generators/tauri-generator.js';
import { isProvisioningEligible, provisionCloudResources } from '../utils/cloud/index.js';

// Helper functions
function isConfigComplete(config: Partial<ProjectConfig>): boolean {
  // Check all required fields are present
  return !!(
    config.projectName &&
    config.framework &&
    config.database !== undefined &&
    config.deployment !== undefined &&
    config.storage !== undefined &&
    config.auth !== undefined &&
    config.packageManager
  );
}

function getDeploymentText(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return 'Vercel';
    case 'tauri':
      return 'GitHub Releases';
    case 'flutter':
      return 'Store Distribution';
    case 'expo':
      return 'EAS Build';
    default:
      return 'Custom';
  }
}

function getAuthText(framework: string): string {
  switch (framework) {
    case 'nextjs':
      return 'Better Auth';
    case 'expo':
      return 'Expo Auth Session';
    default:
      return 'Custom Auth';
  }
}

// Main project generation logic
async function runProjectGeneration(config: ProjectConfig) {
  // Validate auth requirements
  if (config.auth && config.orm !== 'prisma') {
    console.log(
      chalk.yellow(
        '\n⚠ Better Auth scaffolding currently requires Prisma. Authentication will be skipped.'
      )
    );
    config.auth = false;
  }

  console.log(chalk.cyan('\n📦 Creating project with the following configuration:'));
  console.log(chalk.gray('  Project: ') + chalk.white(config.projectName));
  console.log(chalk.gray('  Framework: ') + chalk.white(config.framework.toUpperCase()));

  if (config.database && config.database !== 'none') {
    console.log(chalk.gray('  Database: ') + chalk.white(config.database));
    if (config.orm) {
      console.log(chalk.gray('  ORM: ') + chalk.white(config.orm));
    }
  }

  if (config.deployment) {
    const deploymentText = getDeploymentText(config.framework);
    console.log(chalk.gray('  Deployment: ') + chalk.white(deploymentText));
  }

  if (config.storage && config.storage !== 'none') {
    console.log(chalk.gray('  Storage: ') + chalk.white(config.storage));
  }

  if (config.auth) {
    const authText = getAuthText(config.framework);
    console.log(chalk.gray('  Authentication: ') + chalk.white(authText));
  }

  if (config.packageManager) {
    console.log(chalk.gray('  Package Manager: ') + chalk.white(config.packageManager));
  }

  try {
    // Step 1: Generate framework-specific project
    let spinner = ora(`Creating ${config.framework} project...`).start();
    await generateFrameworkProject(config);
    spinner.succeed(`${config.framework} project created`);

    // Step 2: Setup database if selected
    if (config.database !== 'none') {
      spinner = ora(`Setting up ${config.database} database with ${config.orm}...`).start();
      await setupDatabase(config);
      spinner.succeed(`${config.database} database configured`);
    }

    // Step 3: Setup storage if selected
    if (config.storage !== 'none') {
      spinner = ora(`Setting up ${config.storage} storage...`).start();
      await setupStorage(config);
      spinner.succeed(`${config.storage} storage configured`);
    }

    // Step 4: Setup deployment if selected
    if (config.deployment) {
      const deploymentText = getDeploymentText(config.framework);
      spinner = ora(`Setting up ${deploymentText} deployment...`).start();
      await setupDeployment(config);
      spinner.succeed(`${deploymentText} deployment configured`);
    }

    // Step 4b: Provision managed cloud resources when eligible
    if (isProvisioningEligible(config)) {
      spinner = ora('Provisioning managed services...').start();
      await provisionCloudResources(config);
      spinner.succeed('Managed services provisioned');
    }

    // Step 5: Setup authentication if selected

    if (config.auth) {
      const authText = getAuthText(config.framework);
      spinner = ora(`Setting up ${authText}...`).start();
      await setupAuth(config);
      spinner.succeed('Authentication configured');
    }

    // Step 6: Install dependencies (skip for Flutter as it uses pub)
    if (config.framework !== 'flutter') {
      spinner = ora('Installing dependencies...').start();
      try {
        await execa(config.packageManager, ['install'], {
          cwd: config.projectPath,
          stdio: 'pipe',
          timeout: 180000, // 3 minute timeout
        });
        spinner.succeed('Dependencies installed');
      } catch (error) {
        spinner.fail('Failed to install dependencies');
        console.error('\nError:', (error as Error).message);
        console.log('\nYou can manually install dependencies by running:');
        console.log(`  cd ${config.projectName}`);
        console.log(`  ${config.packageManager} install`);
      }
    } else {
      spinner = ora('Installing Flutter dependencies...').start();
      await execa('flutter', ['pub', 'get'], {
        cwd: config.projectPath,
        stdio: 'pipe',
      });
      spinner.succeed('Flutter dependencies installed');
    }

    // Step 7: Initialize database if configured
    if (config.database !== 'none' && config.orm === 'prisma' && config.framework !== 'flutter') {
      spinner = ora('Setting up database...').start();
      try {
        // For Turso, ensure database file exists
        if (config.database === 'turso') {
          await fs.ensureDir(path.join(config.projectPath, 'prisma'));
          await fs.ensureFile(path.join(config.projectPath, 'prisma', 'dev.db'));
        }

        // Generate Prisma client
        spinner.text = 'Generating Prisma client...';
        await execa(config.packageManager, ['run', 'db:generate'], {
          cwd: config.projectPath,
          stdio: 'pipe',
        });

        // Push schema to database with force reset for initial setup
        spinner.text = 'Creating database tables...';
        await execa(config.packageManager, ['run', 'db:push:force'], {
          cwd: config.projectPath,
          stdio: 'pipe',
        });

        // Seed database
        spinner.text = 'Seeding database with sample data...';
        await execa(config.packageManager, ['run', 'db:seed'], {
          cwd: config.projectPath,
          stdio: 'pipe',
        });

        spinner.succeed('Database initialized and seeded');
      } catch (_error) {
        spinner.warn('Database setup incomplete. You can run it manually later with:');
        console.log(chalk.gray(`    cd ${config.projectName}`));
        console.log(chalk.gray(`    ${config.packageManager} run db:generate`));
        console.log(chalk.gray(`    ${config.packageManager} run db:push:force`));
        console.log(chalk.gray(`    ${config.packageManager} run db:seed`));
      }
    }

    // Step 8: Setup Vercel Blob storage automatically if configured
    if (config.storage === 'vercel-blob' && config.framework === 'nextjs') {
      spinner = ora('Setting up Vercel Blob storage...').start();
      try {
        // Check if Vercel CLI is installed globally
        try {
          await execa('vercel', ['--version'], { stdio: 'pipe' });
        } catch {
          // Install Vercel CLI if not present
          spinner.text = 'Installing Vercel CLI...';
          await execa('npm', ['install', '-g', 'vercel'], { stdio: 'pipe' });
        }

        spinner.text = 'Configuring Vercel Blob storage...';

        // Create an automated setup script that runs non-interactively
        const autoSetupScript = `#!/bin/bash
set -e

# Check if already configured
if [ -f ".env.local" ] && grep -q "BLOB_READ_WRITE_TOKEN=" .env.local; then
  TOKEN_VALUE=$(grep BLOB_READ_WRITE_TOKEN= .env.local | cut -d'=' -f2)
  if [ -n "$TOKEN_VALUE" ]; then
    echo "✅ Blob token already configured"
    exit 0
  fi
fi

echo "📦 Setting up Vercel Blob Storage..."

# Try to link project if not already linked
if [ ! -f ".vercel/project.json" ]; then
  vercel link --yes 2>/dev/null || true
fi

# Check if we can get stores
BLOB_STORES=$(vercel blob store ls 2>/dev/null || echo "")

# Create store if needed
if [ -z "$BLOB_STORES" ] || [[ "$BLOB_STORES" == *"No stores"* ]] || [[ "$BLOB_STORES" == *"Error"* ]]; then
  STORE_NAME="blob-$(date +%s)"
  vercel blob store add $STORE_NAME 2>/dev/null || true
fi

echo ""
echo "⚠️ Manual step required:"
echo "  1. Visit: https://vercel.com/dashboard/stores"
echo "  2. Create or select a Blob store"
echo "  3. Copy the Read/Write token"
echo "  4. Add it to .env.local as BLOB_READ_WRITE_TOKEN"
echo ""
echo "✔ Vercel Blob storage configured (manual token setup required)"
`;

        const autoSetupPath = path.join(config.projectPath, 'auto-blob-setup.sh');
        await fs.writeFile(autoSetupPath, autoSetupScript, { mode: 0o755 });

        // Run the automated setup
        await execa('bash', [autoSetupPath], {
          cwd: config.projectPath,
          stdio: 'pipe',
        });

        // Clean up temporary script
        await fs.remove(autoSetupPath);

        spinner.succeed('Vercel Blob storage configured');
        console.log(
          chalk.yellow('  ℹ️  Note: Create a BLOB_READ_WRITE_TOKEN in the Vercel dashboard:')
        );
        console.log(chalk.gray('      1. Go to https://vercel.com/dashboard'));
        console.log(chalk.gray('      2. Select your project'));
        console.log(chalk.gray('      3. Go to Storage tab'));
        console.log(chalk.gray('      4. Select your blob store'));
        console.log(chalk.gray('      5. Create a read/write token'));
        console.log(chalk.gray('      6. Add it as BLOB_READ_WRITE_TOKEN environment variable'));
      } catch (_error) {
        spinner.warn('Vercel Blob setup incomplete. You can set it up manually later with:');
        console.log(chalk.gray(`    cd ${config.projectName}`));
        console.log(chalk.gray(`    ${config.packageManager} run setup:blob`));
        console.log(chalk.gray('    Or manually configure BLOB_READ_WRITE_TOKEN in .env.local'));
      }
    }

    // Success message
    console.log(chalk.green('\n✅ Project created successfully!\n'));
    console.log(chalk.cyan('To get started:'));
    console.log(chalk.gray(`  cd ${config.projectName}`));

    // Framework-specific dev commands
    switch (config.framework) {
      case 'nextjs':
        console.log(chalk.gray(`  ${config.packageManager} run dev`));
        break;
      case 'expo':
        console.log(chalk.gray(`  ${config.packageManager} start`));
        console.log(chalk.gray(`  # Then press 'i' for iOS, 'a' for Android, or 'w' for web`));
        break;
      case 'tauri':
        console.log(chalk.gray(`  ${config.packageManager} run tauri dev`));
        break;
      case 'flutter':
        console.log(chalk.gray('  flutter run'));
        console.log(chalk.gray('  # For web: flutter run -d chrome'));
        break;
    }

    if (config.database !== 'none') {
      console.log(chalk.cyan('\nDatabase commands:'));
      console.log(
        chalk.gray(`  ${config.packageManager} run db:generate  # Generate Prisma client`)
      );
      console.log(chalk.gray(`  ${config.packageManager} run db:migrate   # Run migrations`));
      console.log(chalk.gray(`  ${config.packageManager} run db:seed      # Seed database`));
      console.log(chalk.gray(`  ${config.packageManager} run db:studio    # Open Prisma Studio`));
    }

    if (config.deployment) {
      console.log(chalk.cyan('\nDeployment commands:'));
      console.log(chalk.gray(`  ${config.packageManager} run deploy       # Deploy to Vercel`));
      console.log(chalk.gray(`  ${config.packageManager} run deploy:prod  # Deploy to production`));
    }

    if (config.storage !== 'none') {
      console.log(chalk.cyan('\nStorage tips:'));
      switch (config.storage) {
        case 'vercel-blob':
          console.log(
            chalk.gray('  Run: ') +
              chalk.yellow(`${config.packageManager} run setup:blob`) +
              chalk.gray(' to automatically configure Blob token')
          );
          console.log(
            chalk.gray('  Or manually set BLOB_READ_WRITE_TOKEN in Vercel env or .env.local')
          );
          break;
        case 'aws-s3':
          console.log(
            chalk.gray(
              '  Configure AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME'
            )
          );
          break;
        case 'cloudflare-r2':
          console.log(
            chalk.gray(
              '  Configure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
            )
          );
          break;
        case 'supabase-storage':
          console.log(
            chalk.gray(
              '  Configure NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET'
            )
          );
          break;
        default:
          break;
      }
    }
  } catch (error) {
    console.error(chalk.red('\n✖ Error creating project:'), error);
    // Cleanup on error
    if (await fs.pathExists(config.projectPath)) {
      await fs.remove(config.projectPath);
    }
    throw error;
  }
}

// Framework project generator dispatcher
async function generateFrameworkProject(config: ProjectConfig) {
  switch (config.framework) {
    case 'nextjs':
      await generateNextProject(config);
      break;
    case 'expo':
      await generateExpoProject(config);
      break;
    case 'tauri':
      await generateTauriProject(config);
      break;
    case 'flutter':
      await generateFlutterProject(config);
      break;
    default:
      throw new Error(`Unsupported framework: ${config.framework}`);
  }
}

// Note: All framework generators are now imported from their respective generator files

export interface ProjectConfig {
  projectName: string;
  projectPath: string;
  framework: 'nextjs' | 'expo' | 'tauri' | 'flutter';
  database: 'none' | 'turso' | 'supabase';
  orm?: 'prisma' | 'drizzle';
  deployment: boolean;
  storage: 'none' | 'vercel-blob' | 'cloudflare-r2' | 'aws-s3' | 'supabase-storage';
  auth: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  mode?: 'full' | 'minimal';
}

export async function createProject(providedConfig?: Partial<ProjectConfig>) {
  // If config is fully provided (for testing), skip interactive mode
  if (providedConfig && isConfigComplete(providedConfig)) {
    const config = { ...providedConfig } as ProjectConfig;

    // Ensure projectPath is set - only if not already provided
    if (!config.projectPath) {
      config.projectPath = path.join(process.cwd(), config.projectName);
    }

    // Debug logging for E2E tests
    if (process.env.NODE_ENV === 'test') {
      console.log(`[DEBUG] Creating project at: ${config.projectPath}`);
    }

    // Check if project directory exists
    if (await fs.pathExists(config.projectPath)) {
      throw new Error(`Directory ${config.projectPath} already exists`);
    }

    // Run generation directly
    await runProjectGeneration(config);
    return;
  }

  console.log(chalk.bold.magenta('\n✨ Multi-Framework Project Generator ✨\n'));

  // Interactive prompts
  const answers = await prompts([
    {
      type: 'select',
      name: 'framework',
      message: 'Select framework:',
      choices: [
        { title: 'Next.js (React web framework)', value: 'nextjs' },
        { title: 'Expo (React Native for mobile)', value: 'expo' },
        { title: 'Tauri (Rust + web frontend desktop)', value: 'tauri' },
        { title: 'Flutter (Cross-platform mobile/desktop)', value: 'flutter' },
      ],
      initial: 0,
    },
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: (prev: string) => {
        switch (prev) {
          case 'nextjs':
            return 'my-next-app';
          case 'expo':
            return 'my-expo-app';
          case 'tauri':
            return 'my-tauri-app';
          case 'flutter':
            return 'my-flutter-app';
          default:
            return 'my-app';
        }
      },
      validate: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Project name is required';
        }
        if (!/^[a-z0-9-_]+$/.test(value)) {
          return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
        }
        return true;
      },
    },
    {
      type: (_prev, values) => (['nextjs', 'expo'].includes(values.framework) ? 'select' : null),
      name: 'database',
      message: 'Select database:',
      choices: [
        { title: 'None', value: 'none' },
        { title: 'Turso (SQLite edge database)', value: 'turso' },
        { title: 'Supabase (PostgreSQL)', value: 'supabase' },
      ],
      initial: 0,
    },
    {
      type: (_prev, values) => (values.database && values.database !== 'none' ? 'select' : null),
      name: 'orm',
      message: 'Select ORM:',
      choices: [
        { title: 'Prisma', value: 'prisma' },
        { title: 'Drizzle', value: 'drizzle' },
      ],
      initial: 0,
    },
    {
      type: (_prev, values) => {
        switch (values.framework) {
          case 'nextjs':
            return 'confirm';
          case 'tauri':
            return 'confirm';
          case 'flutter':
            return 'confirm';
          default:
            return null;
        }
      },
      name: 'deployment',
      message: (_prev, values) => {
        switch (values.framework) {
          case 'nextjs':
            return 'Setup Vercel deployment?';
          case 'tauri':
            return 'Setup GitHub Releases for desktop distribution?';
          case 'flutter':
            return 'Setup store distribution (Play Store/App Store)?';
          default:
            return 'Setup deployment?';
        }
      },
      initial: false,
    },
    {
      type: (_prev, values) => (['nextjs', 'expo'].includes(values.framework) ? 'select' : null),
      name: 'storage',
      message: 'Select storage provider:',
      choices: [
        { title: 'None', value: 'none' },
        { title: 'Vercel Blob', value: 'vercel-blob' },
        { title: 'Cloudflare R2', value: 'cloudflare-r2' },
        { title: 'AWS S3', value: 'aws-s3' },
        { title: 'Supabase Storage', value: 'supabase-storage' },
      ],
      initial: 0,
    },
    {
      type: (_prev, values) =>
        values.framework === 'nextjs' && values.database !== 'none' && values.orm === 'prisma'
          ? 'confirm'
          : null,
      name: 'auth',
      message: (_prev, values) => {
        switch (values.framework) {
          case 'nextjs':
            return 'Add authentication (Better Auth)?';
          case 'expo':
            return 'Add authentication (Expo Auth Session)?';
          default:
            return 'Add authentication?';
        }
      },
      initial: false,
    },
    {
      type: (_prev, values) => (values.framework !== 'flutter' ? 'select' : null),
      name: 'packageManager',
      message: 'Select package manager:',
      choices: [
        { title: 'pnpm', value: 'pnpm' },
        { title: 'npm', value: 'npm' },
        { title: 'yarn', value: 'yarn' },
        { title: 'bun', value: 'bun' },
      ],
      initial: 0,
    },
  ]);

  // Check if user cancelled
  if (!answers.projectName) {
    console.log(chalk.yellow('\n✖ Project creation cancelled'));
    process.exit(0);
  }

  const config: ProjectConfig = {
    ...answers,
    database: answers.database ?? 'none',
    storage: (answers.storage ?? 'none') as ProjectConfig['storage'],
    auth: answers.auth ?? false,
    deployment: answers.deployment ?? false,
    packageManager: answers.packageManager ?? 'pnpm',
    projectPath: path.join(process.cwd(), answers.projectName),
    mode: 'full',
  };

  // Check if project directory exists
  if (await fs.pathExists(config.projectPath)) {
    console.log(chalk.red(`\n✖ Directory ${config.projectName} already exists`));
    process.exit(1);
  }

  try {
    // Run the common generation logic
    await runProjectGeneration(config);
  } catch (error) {
    console.error(chalk.red('\n✖ Error creating project:'), error);
    process.exit(1);
  }
}
