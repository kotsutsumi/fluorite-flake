#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const program = new Command();

// Configure the CLI
program
  .name('fluorite-flake')
  .description('A beautiful CLI utility with ANSI colors')
  .version(packageJson.version);

// Add a sample command
program
  .command('greet [name]')
  .description('Greet someone with beautiful colors')
  .option('-u, --uppercase', 'Display name in uppercase')
  .option('-c, --color <color>', 'Choose greeting color', 'cyan')
  .action((name: string | undefined, options) => {
    const nameToUse = name || 'World';
    const spinner = ora('Preparing your greeting...').start();

    setTimeout(() => {
      spinner.succeed('Greeting ready!');

      const displayName = options.uppercase ? nameToUse.toUpperCase() : nameToUse;

      // Get the color function from chalk
      let colorFn = chalk.cyan;
      if (options.color && typeof chalk[options.color as keyof typeof chalk] === 'function') {
        colorFn = chalk[options.color as keyof typeof chalk] as typeof chalk.cyan;
      }

      console.log();
      console.log(chalk.bold.magenta('✨ Fluorite CLI ✨'));
      console.log(colorFn(`Hello, ${displayName}!`));
      console.log();
      console.log(chalk.gray('Thanks for using Fluorite CLI'));
    }, 1000);
  });

// Add another sample command
program
  .command('rainbow <text>')
  .description('Display text in rainbow colors')
  .action((text: string) => {
    const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];

    console.log();
    const chars = text.split('');
    const coloredText = chars.map((char, index) => colors[index % colors.length](char)).join('');

    console.log(chalk.bold('🌈 Rainbow Text:'));
    console.log(coloredText);
    console.log();
  });

// Add a status command
program
  .command('status')
  .description('Show system status with colors')
  .action(() => {
    console.log();
    console.log(chalk.bold.white('System Status:'));
    console.log(chalk.green('✓ System:    ') + chalk.gray('Online'));
    console.log(chalk.green('✓ Database:  ') + chalk.gray('Connected'));
    console.log(chalk.yellow('⚠ Cache:     ') + chalk.gray('Limited'));
    console.log(chalk.red('✗ Analytics: ') + chalk.gray('Offline'));
    console.log();

    const progressBar = '█'.repeat(7) + '░'.repeat(3);
    console.log(chalk.blue('Progress: ') + chalk.cyan(progressBar) + chalk.gray(' 70%'));
    console.log();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
