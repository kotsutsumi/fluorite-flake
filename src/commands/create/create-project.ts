import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'node:path';
import prompts from 'prompts';

import { isConfigComplete } from './is-config-complete.js';
import { runProjectGeneration } from './run-project-generation.js';
import type { ProjectConfig } from './types.js';

export async function createProject(providedConfig?: Partial<ProjectConfig>) {
    if (providedConfig && isConfigComplete(providedConfig)) {
        const config = { ...providedConfig } as ProjectConfig;

        if (!config.projectPath) {
            config.projectPath = path.join(process.cwd(), config.projectName);
        }

        if (process.env.NODE_ENV === 'test') {
            console.log(`[DEBUG] Creating project at: ${config.projectPath}`);
        }

        if (await fs.pathExists(config.projectPath)) {
            throw new Error(`Directory ${config.projectPath} already exists`);
        }

        await runProjectGeneration(config);
        return;
    }

    console.log(chalk.bold.magenta('\n✨ Multi-Framework Project Generator ✨\n'));

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
            type: (_prev, values) =>
                ['nextjs', 'expo'].includes(values.framework) ? 'select' : null,
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
            type: (_prev, values) =>
                values.database && values.database !== 'none' ? 'select' : null,
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
            type: (_prev, values) =>
                ['nextjs', 'expo'].includes(values.framework) ? 'select' : null,
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
                values.framework === 'nextjs' &&
                values.database !== 'none' &&
                values.orm === 'prisma'
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

    if (await fs.pathExists(config.projectPath)) {
        console.log(chalk.red(`\n✖ Directory ${config.projectName} already exists`));
        process.exit(1);
    }

    try {
        await runProjectGeneration(config);
    } catch (error) {
        console.error(chalk.red('\n✖ Error creating project:'), error);
        process.exit(1);
    }
}
