/**
 * 環境変数管理用のツールキットスクリプトを作成するヘルパー関数
 * 環境変数の管理とバリデーション用スクリプトを生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';

/**
 * 環境変数管理用のツールキットスクリプトを作成する
 * @param config プロジェクト設定
 */
export async function createEnvToolkitScripts(config: ProjectConfig): Promise<void> {
    const script = await readTemplate('next/scripts/env-tools.ts.template');
    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'env-tools.ts'), script);
}
