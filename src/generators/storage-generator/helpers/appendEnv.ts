import path from 'node:path';
import fs from 'fs-extra';

import { ENV_TARGET_FILES } from '../constants/envTargetFiles.js';

/**
 * 環境変数ファイルに内容を追加する関数
 * フレームワークに応じて適切な環境ファイルに追記
 * @param projectPath プロジェクトのパス
 * @param content 追加する内容
 * @param framework フレームワークの種類
 */
export async function appendEnv(projectPath: string, content: string, framework?: string) {
    // Next.jsの場合、存在するすべての環境ファイルに追記
    if (framework === 'nextjs') {
        for (const file of ENV_TARGET_FILES) {
            const envPath = path.join(projectPath, file);
            // ファイルが存在する場合のみ追記
            if (await fs.pathExists(envPath)) {
                await fs.appendFile(envPath, `\n${content}`);
            }
        }
    } else {
        // 他のフレームワークの場合、元の動作を維持 - 必要に応じて.env.localを作成
        const envPath = path.join(projectPath, '.env.local');
        await fs.appendFile(envPath, content);

        // .env.developmentが存在する場合は追記（それを使用するフレームワーク用）
        const envDevPath = path.join(projectPath, '.env.development');
        if (await fs.pathExists(envDevPath)) {
            await fs.appendFile(envDevPath, content);
        }
    }
}
