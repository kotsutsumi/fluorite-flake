import path from 'node:path';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * Next.js ミドルウェアファイルを生成する
 * 認証保護ページのルーティング制御を担当
 */
export async function writeMiddleware(config: ProjectConfig) {
    await writeTemplateFile(
        path.join(config.projectPath, 'middleware.ts'),
        'auth/middleware.ts.template'
    );
}
