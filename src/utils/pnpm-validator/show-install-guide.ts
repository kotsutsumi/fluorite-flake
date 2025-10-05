/**
 * pnpmのインストールガイドを表示するユーティリティ
 */
import chalk from "chalk";

import { getMessages } from "../../i18n.js";

/**
 * pnpmのインストールガイドを表示
 */
export function showPnpmInstallGuide(): void {
    const { create } = getMessages();

    console.log(chalk.yellow(`\n${create.pnpmInstallGuide}`));
    for (const command of create.pnpmInstallCommands) {
        console.log(chalk.cyan(command));
    }
    console.log(chalk.gray(`\n${create.pnpmMoreInfo}\n`));
}

// EOF
