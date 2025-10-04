import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * ユーザー管理用の API ルートを生成する
 * ユーザーの CRUD 操作を行うエンドポイント
 */
export async function writeUsersApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/users');
    const userIdDir = path.join(dir, '[id]');
    await fs.ensureDir(dir);
    await fs.ensureDir(userIdDir);

    await writeTemplateFile(path.join(dir, 'route.ts'), 'auth/api/users/route.ts.template');
    await writeTemplateFile(
        path.join(userIdDir, 'route.ts'),
        'auth/api/users/[id]/route.ts.template'
    );
}
