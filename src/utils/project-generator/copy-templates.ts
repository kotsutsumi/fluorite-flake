/**
 * templates/ ディレクトリをコピーする
 */
import fs from "fs-extra";
import { promises as fsPromises } from "node:fs";
import path from "node:path";

/**
 * ディレクトリ内の全ての.shファイルに実行権限を付与する関数
 * @param dir - 対象ディレクトリのパス
 */
async function setExecutablePermissions(dir: string): Promise<void> {
    try {
        // ディレクトリ内のエントリを取得
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });

        // 各エントリを処理
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // ディレクトリの場合は再帰的に処理
                await setExecutablePermissions(fullPath);
            } else if (entry.isFile() && entry.name.endsWith(".sh")) {
                // .shファイルの場合は実行権限を付与（0o755 = rwxr-xr-x）
                await fsPromises.chmod(fullPath, 0o755);
            }
        }
    } catch (error) {
        // エラーが発生した場合はログ出力して続行（権限設定失敗でプロジェクト生成を止めない）
        console.warn(`Warning: Failed to set executable permissions in ${dir}:`, error);
    }
}

/**
 * ディレクトリ内の全てのgitignoreファイルを.gitignoreにリネームする関数
 * npmパッケージでは.gitignoreが除外されるため、gitignore（ドットなし）で配布し、
 * コピー時に.gitignoreにリネームする
 * @param dir - 対象ディレクトリのパス
 */
async function renameGitignoreFiles(dir: string): Promise<void> {
    try {
        // ディレクトリ内のエントリを取得
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });

        // 各エントリを処理
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // ディレクトリの場合は再帰的に処理
                await renameGitignoreFiles(fullPath);
            } else if (entry.isFile() && entry.name === "gitignore") {
                // gitignoreファイルの場合は.gitignoreにリネーム
                const newPath = path.join(dir, ".gitignore");
                await fsPromises.rename(fullPath, newPath);
            }
        }
    } catch (error) {
        // エラーが発生した場合はログ出力して続行
        console.warn(`Warning: Failed to rename gitignore files in ${dir}:`, error);
    }
}

/**
 * templates/ ディレクトリを指定先にコピーする関数
 * @param templatesDir - templates/ ディレクトリのパス
 * @param targetDir - コピー先のディレクトリパス
 */
export async function copyTemplates(templatesDir: string, targetDir: string): Promise<void> {
    try {
        // templates/ ディレクトリの存在確認
        if (!fs.existsSync(templatesDir)) {
            throw new Error(`Templates directory not found: ${templatesDir}`);
        }

        // fs-extra の copy 関数で再帰的にコピー
        await fs.copy(templatesDir, targetDir, {
            overwrite: true,
            errorOnExist: false,
            preserveTimestamps: true,
        });

        // コピー後、gitignoreファイルを.gitignoreにリネーム
        await renameGitignoreFiles(targetDir);

        // コピー後、全ての.shファイルに実行権限を付与
        await setExecutablePermissions(targetDir);
    } catch (error) {
        // エラーが発生した場合は再スロー
        if (error instanceof Error) {
            throw new Error(`Failed to copy templates: ${error.message}`);
        }
        throw error;
    }
}

// EOF
