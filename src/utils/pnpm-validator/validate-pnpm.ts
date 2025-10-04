import { execSync } from "node:child_process";
import chalk from "chalk";

import { getMessages } from "../../i18n.js";
import { showPnpmInstallGuide } from "./show-install-guide.js";

/**
 * pnpmの最小必要バージョン
 */
const MIN_PNPM_VERSION = 10;

/**
 * pnpmのバージョンを確認する
 */
export function validatePnpm(): boolean {
    const { create } = getMessages();

    try {
        // pnpmのバージョンを取得
        const versionOutput = execSync("pnpm --version", {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        const version = versionOutput;
        const majorVersion = Number.parseInt(version.split(".")[0], 10);

        if (majorVersion < MIN_PNPM_VERSION) {
            console.error(
                chalk.red(
                    create.pnpmVersionTooOld(
                        version,
                        MIN_PNPM_VERSION.toString()
                    )
                )
            );
            showPnpmInstallGuide();
            return false;
        }

        console.log(chalk.green(create.pnpmVersionValid(version)));
        return true;
    } catch (error) {
        console.error(chalk.red(create.pnpmNotFound));
        showPnpmInstallGuide();
        return false;
    }
}

// EOF
