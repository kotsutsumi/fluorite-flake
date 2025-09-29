import path from 'node:path';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * 認証関連のヘルパー関数ファイルを生成する
 * エラーハンドリングなどの共通処理を提供
 */
export async function writeHelperFunctions(config: ProjectConfig) {
    const helperPath = path.join(config.projectPath, 'src/lib/error-helper.ts');
    await writeTemplateFile(helperPath, 'auth/lib/error-helper.ts.template');
}
