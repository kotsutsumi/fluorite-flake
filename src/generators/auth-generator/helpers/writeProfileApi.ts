import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * プロフィール管理用の API ルートを生成する
 * ユーザーのプロフィール情報の更新を行うエンドポイント
 */
export async function writeProfileApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/profile');
    await fs.ensureDir(dir);

    await writeTemplateFile(path.join(dir, 'route.ts'), 'auth/api/profile/route.ts.template');
}
