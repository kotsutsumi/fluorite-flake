import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeCustomAuthApi } from './writeCustomAuthApi.js';
import { writeOrganizationsApi } from './writeOrganizationsApi.js';
import { writeProfileApi } from './writeProfileApi.js';
import { writeUsersApi } from './writeUsersApi.js';

/**
 * 認証関連のカスタム API ルートをすべて生成する
 * 組織管理、ユーザー管理、プロフィール管理の API エンドポイントを作成
 */
export async function writeApiRoutes(config: ProjectConfig) {
    const apiDir = path.join(config.projectPath, 'src/app/api');
    await fs.ensureDir(apiDir);

    await writeCustomAuthApi(config);
    await writeOrganizationsApi(config);
    await writeUsersApi(config);
    await writeProfileApi(config);
}
