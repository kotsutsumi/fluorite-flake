/**
 * セットアップコマンドを順次実行する
 */
import { execa } from "execa";
import type { Ora } from "ora";
import type { SetupResult } from "./types.js";

/**
 * セットアップコマンドのリスト
 */
const SETUP_COMMANDS = [
    { command: "pnpm", args: ["i"], description: "パッケージインストール" },
    {
        command: "pnpm",
        args: ["env:init"],
        description: "環境変数ファイル初期化",
    },
    {
        command: "pnpm",
        args: ["env:gen:secret"],
        description: "シークレットキー生成",
    },
    { command: "pnpm", args: ["db:reset"], description: "データベースリセット" },
];

/**
 * セットアップコマンドを順次実行する関数
 * @param projectDir - プロジェクトディレクトリのパス
 * @param spinner - スピナーインスタンス（進捗表示用、オプション）
 * @returns セットアップ結果
 */
export async function runSetupCommands(projectDir: string, spinner?: Ora): Promise<SetupResult> {
    for (const { command, args, description } of SETUP_COMMANDS) {
        try {
            // スピナーのテキストを更新
            if (spinner) {
                spinner.text = `${description}中...`;
            }

            // コマンドを実行
            await execa(command, args, {
                cwd: projectDir,
                stdio: "inherit",
            });
        } catch (error) {
            // エラーが発生した場合は失敗結果を返す
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage,
                command: `${command} ${args.join(" ")}`,
            };
        }
    }

    // すべてのコマンドが成功した場合
    return {
        success: true,
    };
}

// EOF
