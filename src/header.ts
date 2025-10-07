/**
 * ヘッダー情報を表示するモジュール
 */
import chalk from "chalk";

import pkg from "../package.json" with { type: "json" };

/**
 * ヘッダー情報を表示する関数
 */
export function printHeader() {
    const name = chalk.bold.cyan("Fluorite Flake");
    const version = chalk.gray(`v${pkg.version}`);
    const tagline = chalk.gray("Boilerplate generator CLI for Fluorite");
    const titleLine = `${chalk.cyan(">")} ${name} ${version}`;
    const underline = chalk.white("─".repeat(titleLine.length));

    // ヘッダー情報をコンソールに出力
    console.log("");
    console.log(titleLine);
    console.log(`  ${tagline}`);
    console.log(underline);
    console.log("");
}

// EOF
