import path from 'node:path';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { writeTemplateFile } from './writeTemplateFile.js';

/**
 * Prisma のシードファイルを認証データで更新する
 * 開発用のテストユーザーや組織データを初期化
 */
export async function updateSeedFileForAuth(config: ProjectConfig) {
    const seedPath = path.join(config.projectPath, 'prisma/seed.ts');
    await writeTemplateFile(seedPath, 'auth/lib/seed.ts.template');
}
