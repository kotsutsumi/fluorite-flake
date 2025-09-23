import path from 'node:path';
import chalk from 'chalk';
import { execa } from 'execa';
import fs from 'fs-extra';
import ora from 'ora';
import prompts from 'prompts';
import { setupAuth } from '../generators/auth-generator.js';
import { setupDatabase } from '../generators/database-generator.js';
import { setupDeployment } from '../generators/deployment-generator.js';
import { generateNextProject } from '../generators/next-generator.js';

export interface ProjectConfig {
  projectName: string;
  projectPath: string;
  database: 'none' | 'turso' | 'supabase';
  orm?: 'prisma' | 'drizzle';
  deployment: boolean;
  auth: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
}

export async function createProject() {
  console.log(chalk.bold.magenta('\n✨ Next.js Boilerplate Generator ✨\n'));

  // Interactive prompts
  const answers = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-next-app',
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
      type: 'select',
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
      type: (_prev, values) => (values.database === 'none' ? null : 'select'),
      name: 'orm',
      message: 'Select ORM:',
      choices: [
        { title: 'Prisma', value: 'prisma' },
        { title: 'Drizzle', value: 'drizzle' },
      ],
      initial: 0,
    },
    {
      type: 'confirm',
      name: 'deployment',
      message: 'Setup Vercel deployment?',
      initial: false,
    },
    {
      type: (_prev, values) => (values.database === 'none' ? null : 'confirm'),
      name: 'auth',
      message: 'Add authentication (Better Auth)?',
      initial: false,
    },
    {
      type: 'select',
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
    projectPath: path.join(process.cwd(), answers.projectName),
  };

  // Check if project directory exists
  if (await fs.pathExists(config.projectPath)) {
    console.log(chalk.red(`\n✖ Directory ${config.projectName} already exists`));
    process.exit(1);
  }

  console.log(chalk.cyan('\n📦 Creating project with the following configuration:'));
  console.log(chalk.gray('  Project: ') + chalk.white(config.projectName));
  console.log(chalk.gray('  Database: ') + chalk.white(config.database));
  if (config.orm) {
    console.log(chalk.gray('  ORM: ') + chalk.white(config.orm));
  }
  console.log(chalk.gray('  Deployment: ') + chalk.white(config.deployment ? 'Vercel' : 'None'));
  console.log(chalk.gray('  Authentication: ') + chalk.white(config.auth ? 'Better Auth' : 'None'));
  console.log(chalk.gray('  Package Manager: ') + chalk.white(config.packageManager));

  try {
    // Step 1: Generate Next.js project
    let spinner = ora('Creating Next.js project...').start();
    await generateNextProject(config);
    spinner.succeed('Next.js project created');

    // Step 2: Setup database if selected
    if (config.database !== 'none') {
      spinner = ora(`Setting up ${config.database} database with ${config.orm}...`).start();
      await setupDatabase(config);
      spinner.succeed(`${config.database} database configured`);
    }

    // Step 3: Setup deployment if selected
    if (config.deployment) {
      spinner = ora('Setting up Vercel deployment...').start();
      await setupDeployment(config);
      spinner.succeed('Vercel deployment configured');
    }

    // Step 4: Setup authentication if selected
    if (config.auth) {
      spinner = ora('Setting up Better Auth...').start();
      await setupAuth(config);
      spinner.succeed('Authentication configured');
    }

    // Step 5: Install dependencies
    spinner = ora('Installing dependencies...').start();
    await execa(config.packageManager, ['install'], {
      cwd: config.projectPath,
      stdio: 'pipe',
    });
    spinner.succeed('Dependencies installed');

    // Success message
    console.log(chalk.green('\n✅ Project created successfully!\n'));
    console.log(chalk.cyan('To get started:'));
    console.log(chalk.gray(`  cd ${config.projectName}`));
    console.log(chalk.gray(`  ${config.packageManager} run dev`));

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
  } catch (error) {
    console.error(chalk.red('\n✖ Error creating project:'), error);
    // Cleanup on error
    if (await fs.pathExists(config.projectPath)) {
      await fs.remove(config.projectPath);
    }
    process.exit(1);
  }
}
