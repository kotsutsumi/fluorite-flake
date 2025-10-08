/**
 * pnpmのバージョンを検証するユーティリティ
 */

import { type ExecSyncOptions, execSync } from "node:child_process";
import chalk from "chalk";

import { getMessages } from "../../i18n.js";
import { getShellForPlatform } from "../shell-helper/index.js";
import { showPnpmInstallGuide } from "./show-install-guide.js";

/**
 * pnpmの最小必要バージョン
 */
const MIN_PNPM_VERSION = 10;

/**
 * pnpmバリデーション結果
 */
export type PnpmValidationResult = {
    /** バリデーションが成功したか */
    isValid: boolean;
    /** pnpmのバージョン文字列（例: "10.18.1"） */
    version?: string;
    /** メジャーバージョン番号（例: 10） */
    majorVersion?: number;
    /** エラーメッセージ（バリデーション失敗時） */
    error?: string;
};

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
            shell: getShellForPlatform(), // クロスプラットフォーム対応：プラットフォーム固有のシェルを使用
        } satisfies ExecSyncOptions).trim();

        // バージョン文字列を保存
        const version = versionOutput;
        // メジャーバージョン番号を抽出（例: "10.1.0" → 10）
        const majorVersion = Number.parseInt(version.split(".")[0], 10);

        // 最小バージョン要件をチェック
        if (majorVersion < MIN_PNPM_VERSION) {
            // バージョンが古い場合：エラーメッセージを表示
            console.error(chalk.red(create.pnpmVersionTooOld(version, MIN_PNPM_VERSION.toString())));
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

/**
 * pnpmのバージョンを検証し、詳細な結果を返す（新しいAPI）
 * テンプレート生成でのバージョン情報取得に使用
 */
export function validatePnpmWithDetails(): PnpmValidationResult {
    const { create } = getMessages();

    try {
        // pnpmのバージョンを取得（標準出力のみを取得し、エラー出力は無視）
        const versionOutput = execSync("pnpm --version", {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            shell: getShellForPlatform(), // クロスプラットフォーム対応：プラットフォーム固有のシェルを使用
        } satisfies ExecSyncOptions).trim();

        // バージョン文字列を保存
        const version = versionOutput;
        // メジャーバージョン番号を抽出（例: "10.1.0" → 10）
        const majorVersion = Number.parseInt(version.split(".")[0], 10);

        // 最小バージョン要件をチェック
        if (majorVersion < MIN_PNPM_VERSION) {
            // バージョンが古い場合：エラーメッセージを表示
            const errorMessage = create.pnpmVersionTooOld(version, MIN_PNPM_VERSION.toString());
            console.error(chalk.red(errorMessage));
            // インストールガイドを表示
            showPnpmInstallGuide();

            return {
                isValid: false,
                version,
                majorVersion,
                error: errorMessage,
            };
        }

        // バージョン要件を満たす場合：成功メッセージを表示
        console.log(chalk.green(create.pnpmVersionValid(version)));

        return {
            isValid: true,
            version,
            majorVersion,
        };
    } catch (error) {
        // pnpmが見つからない場合：エラーメッセージを表示
        const errorMessage = create.pnpmNotFound;
        console.error(chalk.red(errorMessage));
        // インストールガイドを表示
        showPnpmInstallGuide();

        return {
            isValid: false,
            error: errorMessage,
        };
    }
}

// EOF
