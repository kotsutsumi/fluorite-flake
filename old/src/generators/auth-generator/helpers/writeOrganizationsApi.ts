import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * 組織管理用の API ルートを生成する
 * 組織の CRUD 操作を行うエンドポイント
 */
export async function writeOrganizationsApi(config: ProjectConfig) {
    const dir = path.join(config.projectPath, 'src/app/api/organizations');
    const organizationIdDir = path.join(dir, '[id]');
    await fs.ensureDir(dir);
    await fs.ensureDir(organizationIdDir);

    await writeTemplateFile(path.join(dir, 'route.ts'), 'auth/api/organizations/route.ts.template');
    await writeTemplateFile(
        path.join(organizationIdDir, 'route.ts'),
        'auth/api/organizations/[id]/route.ts.template'
    );
}
