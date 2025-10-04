import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * Better Auth のメイン API ルート（/api/auth/[...all]）を生成する
 * すべての認証関連リクエストはここでハンドリングされる
 */
export async function writeAuthApiRoute(config: ProjectConfig) {
    const authApiDir = path.join(config.projectPath, 'src/app/api/auth/[...all]');
    await fs.ensureDir(authApiDir);
    await writeTemplateFile(
        path.join(authApiDir, 'route.ts'),
        'auth/api/auth/[...all]/route.ts.template'
    );
}
