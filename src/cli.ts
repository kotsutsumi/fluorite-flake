#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProject } from './commands/create/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

// Configure the CLI
program
    .name('fluorite-flake')
    .description('Multi-framework project generator')
    .version(packageJson.version);

// Add create command for Next.js boilerplate generator
program
    .command('create')
    .alias('new')
    .description('Create a new project with interactive options (Next.js, Expo, Tauri, Flutter)')
    .action(async () => {
        await createProject();
    });

// Parse command line arguments, accounting for pnpm's `--` forwarding.
const sanitizedUserArgs = process.argv.slice(2).filter((arg) => arg !== '--');

if (sanitizedUserArgs.length === 0) {
    program.outputHelp();
    process.exit(0);
}

const argvToParse = [...process.argv];
// Drop pnpm's '--' separator so Commander still sees forwarded flags.
const separatorIndex = argvToParse.indexOf('--');
if (separatorIndex !== -1) {
    argvToParse.splice(separatorIndex, 1);
}

program.parse(argvToParse);
