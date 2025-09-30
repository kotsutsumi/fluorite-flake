import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * ストレージライブラリファイルを書き込む関数
 * @param config プロジェクト設定
 * @param contents ファイルの内容
 */
export async function writeStorageLib(config: ProjectConfig, contents: string) {
    const baseDir = config.framework === 'expo' ? 'lib' : 'src/lib';
    const storagePath = path.join(config.projectPath, baseDir, 'storage.ts');
    await fs.ensureDir(path.dirname(storagePath));
    await fs.writeFile(storagePath, contents);
}
