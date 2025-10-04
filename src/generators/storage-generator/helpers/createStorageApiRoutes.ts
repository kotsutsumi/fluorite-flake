import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';

/**
 * ストレージ用のAPIルートを作成する関数
 * アップロード、汎用アクセス、デバッグ用のルートを生成
 * @param config プロジェクト設定
 */
export async function createStorageApiRoutes(config: ProjectConfig) {
    // テンプレートからアップロードルートを作成
    const uploadRouteContent = await readTemplate('storage/common/api/upload-route.ts.template');
    const uploadRouteDir = path.join(config.projectPath, 'src/app/api/upload');
    await fs.ensureDir(uploadRouteDir);
    await fs.writeFile(path.join(uploadRouteDir, 'route.ts'), uploadRouteContent);

    // APIアクセス用のストレージキャッチオールルートを作成
    const catchAllContent = await readTemplate('storage/common/api/storage-catch-all.ts.template');
    const catchAllDir = path.join(config.projectPath, 'src/app/api/storage/[...path]');
    await fs.ensureDir(catchAllDir);
    await fs.writeFile(path.join(catchAllDir, 'route.ts'), catchAllContent);

    // 開発用のストレージデバッグルートを作成
    const debugContent = await readTemplate('storage/common/api/storage-debug.ts.template');
    const debugDir = path.join(config.projectPath, 'src/app/api/storage/debug');
    await fs.ensureDir(debugDir);
    await fs.writeFile(path.join(debugDir, 'route.ts'), debugContent);
}
