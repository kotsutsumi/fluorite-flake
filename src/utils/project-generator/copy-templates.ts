/**
 * templates/ ディレクトリをコピーする
 */
import fs from "fs-extra";

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
    } catch (error) {
        // エラーが発生した場合は再スロー
        if (error instanceof Error) {
            throw new Error(`Failed to copy templates: ${error.message}`);
        }
        throw error;
    }
}

// EOF
