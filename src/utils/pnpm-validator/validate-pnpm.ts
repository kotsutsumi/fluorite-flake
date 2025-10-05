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
        // pnpmのバージョンを取得（標準出力のみを取得し、エラー出力は無視）
        const versionOutput = execSync("pnpm --version", {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        // バージョン文字列を保存
        const version = versionOutput;
        // メジャーバージョン番号を抽出（例: "10.1.0" → 10）
        const majorVersion = Number.parseInt(version.split(".")[0], 10);

        // 最小バージョン要件をチェック
        if (majorVersion < MIN_PNPM_VERSION) {
            // バージョンが古い場合：エラーメッセージを表示
            console.error(
                chalk.red(
                    create.pnpmVersionTooOld(
                        version,
                        MIN_PNPM_VERSION.toString()
                    )
                )
            );
            // インストールガイドを表示して失敗を返す
            showPnpmInstallGuide();
            return false;
        }

        // バージョン要件を満たす場合：成功メッセージを表示
        console.log(chalk.green(create.pnpmVersionValid(version)));
        return true;
    } catch (error) {
        // pnpmが見つからない場合：エラーメッセージを表示
        console.error(chalk.red(create.pnpmNotFound));
        // インストールガイドを表示して失敗を返す
        showPnpmInstallGuide();
        return false;
    }
}

// EOF
