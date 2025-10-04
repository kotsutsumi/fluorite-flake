/**
 * デプロイメント破棄スクリプトを作成する関数
 * Vercelプロジェクトや関連リソースを削除するためのスクリプト
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';

/**
 * デプロイメント破棄スクリプトを作成する関数
 * Vercelプロジェクトや関連リソースを削除するためのスクリプト
 * @param config プロジェクト設定
 */
export async function createDestroyDeploymentScript(config: ProjectConfig) {
    // テンプレートから破棄スクリプトを読み込み
    const content = await readTemplate('scripts/destroy-deployment.ts.template');
    const scriptPath = path.join(config.projectPath, 'scripts', 'destroy-deployment.ts');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, content);
}
