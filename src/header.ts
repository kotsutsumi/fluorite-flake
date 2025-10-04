import chalk from 'chalk';

import pkg from '../package.json' assert { type: 'json' };

export function printHeader() {
    const name = chalk.bold.cyan('Fluorite Flake');
    const version = chalk.gray(`v${pkg.version}`);
    const tagline = chalk.gray('Boilerplate generator CLI for Fluorite');
    const titleLine = `${chalk.cyan('>')} ${name} ${version}`;
    const underline = chalk.white('─'.repeat(titleLine.length));

    console.log('');
    console.log(titleLine);
    console.log(underline);
    console.log(`  ${tagline}`);
    console.log('');
}
