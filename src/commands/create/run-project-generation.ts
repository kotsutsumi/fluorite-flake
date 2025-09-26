import path from 'node:path';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import ora from 'ora';

import { setupAuth } from '../../generators/auth-generator.js';
import { setupDatabase } from '../../generators/database-generator.js';
import { setupDeployment } from '../../generators/deployment-generator.js';
import { setupStorage } from '../../generators/storage-generator.js';
import { setupStorybook } from '../../generators/storybook-generator.js';
import { isProvisioningEligible, provisionCloudResources } from '../../utils/cloud/index.js';
import { generateFrameworkProject } from './generate-framework-project.js';
import { getAuthText } from './get-auth-text.js';
import { getDeploymentText } from './get-deployment-text.js';
import type { ProjectConfig } from './types.js';

export async function runProjectGeneration(config: ProjectConfig) {
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

    if (config.storybook) {
        console.log(chalk.gray('  Storybook: ') + chalk.white('Component development & testing'));
    }

    if (config.packageManager) {
        console.log(chalk.gray('  Package Manager: ') + chalk.white(config.packageManager));
    }

    try {
        const isTestMode = process.env.FLUORITE_TEST_MODE === 'true';
        let spinner = ora(`Creating ${config.framework} project...`).start();
        await generateFrameworkProject(config);
        spinner.succeed(`${config.framework} project created`);

        if (config.database !== 'none') {
            spinner = ora(`Setting up ${config.database} database with ${config.orm}...`).start();
            await setupDatabase(config);
            spinner.succeed(`${config.database} database configured`);
        }

        if (config.storage !== 'none') {
            spinner = ora(`Setting up ${config.storage} storage...`).start();
            await setupStorage(config);
            spinner.succeed(`${config.storage} storage configured`);
        }

        if (config.deployment) {
            const deploymentText = getDeploymentText(config.framework);
            spinner = ora(`Setting up ${deploymentText} deployment...`).start();
            await setupDeployment(config);
            spinner.succeed(`${deploymentText} deployment configured`);
        }

        if (isProvisioningEligible(config)) {
            spinner = ora('Provisioning managed services...').start();
            await provisionCloudResources(config);
            spinner.succeed('Managed services provisioned');
        }

        if (config.auth) {
            const authText = getAuthText(config.framework);
            spinner = ora(`Setting up ${authText}...`).start();
            await setupAuth(config);
            spinner.succeed('Authentication configured');
        }

        if (config.storybook) {
            spinner = ora('Setting up Storybook...').start();
            await setupStorybook(config);
            spinner.succeed('Storybook configured');
        }

        if (config.framework !== 'flutter') {
            if (isTestMode) {
                ora('Skipping dependency installation in test mode').info();
            } else {
                spinner = ora('Installing dependencies...').start();
                try {
                    const useInheritStdio =
                        config.packageManager === 'pnpm' || config.packageManager === 'yarn';

                    const childProcess = execa(config.packageManager, ['install'], {
                        cwd: config.projectPath,
                        stdio: useInheritStdio ? ['inherit', 'pipe', 'inherit'] : 'pipe',
                        timeout: 180000,
                    });

                    if (!useInheritStdio) {
                        const progressInterval = setInterval(() => {
                            const dots = spinner.text.endsWith('...') ? '' : '.';
                            spinner.text = `Installing dependencies${dots ? '' : '.'}${dots}${dots}`;
                        }, 1000);

                        await childProcess;
                        clearInterval(progressInterval);
                    } else {
                        await childProcess;
                    }

                    spinner.succeed('Dependencies installed');
                } catch (error) {
                    spinner.fail('Failed to install dependencies');
                    console.error('Error:', (error as Error).message);
                    console.log('You can manually install dependencies by running:');
                    console.log(`  cd ${config.projectName}`);
                    console.log(`  ${config.packageManager} install`);
                }
            }
        } else {
            if (isTestMode) {
                ora('Skipping Flutter dependency installation in test mode').info();
            } else {
                spinner = ora('Installing Flutter dependencies...').start();
                await execa('flutter', ['pub', 'get'], {
                    cwd: config.projectPath,
                    stdio: 'pipe',
                });
                spinner.succeed('Flutter dependencies installed');
            }
        }

        if (
            config.database !== 'none' &&
            config.orm === 'prisma' &&
            config.framework !== 'flutter'
        ) {
            if (isTestMode) {
                ora('Skipping Prisma database CLI tasks in test mode').info();
            } else {
                spinner = ora('Setting up database...').start();
                try {
                    if (config.database === 'turso') {
                        await fs.ensureDir(path.join(config.projectPath, 'prisma'));
                        await fs.ensureFile(path.join(config.projectPath, 'prisma', 'dev.db'));
                    }

                    spinner.text = 'Generating Prisma client...';
                    await execa(config.packageManager, ['run', 'db:generate'], {
                        cwd: config.projectPath,
                        stdio: 'pipe',
                    });

                    spinner.text = 'Creating database tables...';
                    await execa(config.packageManager, ['run', 'db:push:force'], {
                        cwd: config.projectPath,
                        stdio: 'pipe',
                    });

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
        }

        if (config.storage === 'vercel-blob' && config.framework === 'nextjs') {
            if (isTestMode) {
                ora('Skipping Vercel Blob provisioning in test mode').info();
            } else {
                spinner = ora('Setting up Vercel Blob storage...').start();
                try {
                    try {
                        await execa('vercel', ['--version'], { stdio: 'pipe' });
                    } catch {
                        spinner.text = 'Installing Vercel CLI...';
                        await execa('npm', ['install', '-g', 'vercel'], { stdio: 'pipe' });
                    }

                    spinner.text = 'Configuring Vercel Blob storage...';

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

                    await execa('bash', [autoSetupPath], {
                        cwd: config.projectPath,
                        stdio: 'pipe',
                    });

                    await fs.remove(autoSetupPath);

                    spinner.succeed('Vercel Blob storage configured');
                    console.log(
                        chalk.yellow(
                            '  ℹ️  Note: Create a BLOB_READ_WRITE_TOKEN in the Vercel dashboard:'
                        )
                    );
                    console.log(chalk.gray('      1. Go to https://vercel.com/dashboard'));
                    console.log(chalk.gray('      2. Select your project'));
                    console.log(chalk.gray('      3. Go to Storage tab'));
                    console.log(chalk.gray('      4. Select your blob store'));
                    console.log(chalk.gray('      5. Create a read/write token'));
                    console.log(
                        chalk.gray('      6. Add it as BLOB_READ_WRITE_TOKEN environment variable')
                    );
                } catch (_error) {
                    spinner.warn(
                        'Vercel Blob setup incomplete. You can set it up manually later with:'
                    );
                    console.log(chalk.gray(`    cd ${config.projectName}`));
                    console.log(chalk.gray(`    ${config.packageManager} run setup:blob`));
                    console.log(
                        chalk.gray('    Or manually configure BLOB_READ_WRITE_TOKEN in .env.local')
                    );
                }
            }
        }

        console.log(chalk.green('\n✅ Project created successfully!\n'));
        console.log(chalk.cyan('To get started:'));
        console.log(chalk.gray(`  cd ${config.projectName}`));

        switch (config.framework) {
            case 'nextjs':
                console.log(chalk.gray(`  ${config.packageManager} run dev`));
                break;
            case 'expo':
                console.log(chalk.gray(`  ${config.packageManager} start`));
                console.log(
                    chalk.gray(`  # Then press 'i' for iOS, 'a' for Android, or 'w' for web`)
                );
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
            console.log(
                chalk.gray(`  ${config.packageManager} run db:studio    # Open Prisma Studio`)
            );
        }

        if (config.deployment) {
            console.log(chalk.cyan('\nDeployment commands:'));
            console.log(
                chalk.gray(`  ${config.packageManager} run deploy       # Deploy to Vercel`)
            );
            console.log(
                chalk.gray(`  ${config.packageManager} run deploy:prod  # Deploy to production`)
            );
        }

        if (config.storybook) {
            console.log(chalk.cyan('\nStorybook commands:'));
            console.log(
                chalk.gray(
                    `  ${config.packageManager} run storybook    # Start Storybook dev server`
                )
            );
            console.log(
                chalk.gray(
                    `  ${config.packageManager} run build-storybook # Build Storybook for production`
                )
            );
            console.log(
                chalk.gray(`  ${config.packageManager} run test:storybook # Run Storybook tests`)
            );
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
                        chalk.gray(
                            '  Or manually set BLOB_READ_WRITE_TOKEN in Vercel env or .env.local'
                        )
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
        if (await fs.pathExists(config.projectPath)) {
            await fs.remove(config.projectPath);
        }
        throw error;
    }
}
