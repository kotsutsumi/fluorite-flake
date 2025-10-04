import path from 'node:path';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { appendEnvFile } from './appendEnvFile.js';

/**
 * プロジェクトの .env.local と .env ファイルに環境変数を追加する
 * 両方のファイルに同じ内容を書き込み、設定の整合性を保つ
 */
export async function appendEnv(config: ProjectConfig, block: string) {
    await appendEnvFile(path.join(config.projectPath, '.env.local'), block);
    await appendEnvFile(path.join(config.projectPath, '.env'), block);
}
