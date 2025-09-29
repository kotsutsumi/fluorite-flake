/**
 * Vercelデプロイメント自動化スクリプトを作成する関数
 * データベースセットアップからデプロイまでを一気に実行するスクリプト
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplateWithReplacements } from '../../../utils/template-reader.js';

/**
 * Vercelデプロイメント自動化スクリプトを作成する関数
 * データベースセットアップからデプロイまでを一気に実行するスクリプト
 * @param config プロジェクト設定
 */
export async function createVercelAutomationScript(config: ProjectConfig) {
    // Tursoセットアップセクションを構築
    let tursoSetup = '';
    if (config.database === 'turso') {
        tursoSetup = `
# Step 1: Set up Turso Cloud databases
echo ""
echo "📦 Step 1: Setting up Turso Cloud databases..."
bash scripts/setup-turso.sh --cloud

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up Turso databases"
    exit 1
fi
`;
    }

    // データベースタイプを決定
    const databaseType = config.database === 'turso' ? 'Turso' : 'Supabase';

    // テンプレートから自動化スクリプトを作成
    const automationScriptContent = await readTemplateWithReplacements(
        'deployment/scripts/automated-deployment.sh.template',
        {
            projectName: config.projectName,
            databaseType,
            packageManager: config.packageManager,
            tursoSetup,
        }
    );

    // スクリプトファイルを書き込み、実行権限を付与
    const scriptPath = path.join(config.projectPath, 'scripts', 'automated-deployment.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, automationScriptContent);
    await fs.chmod(scriptPath, '755');

    // package.jsonに自動デプロイメントスクリプトを追加
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    packageJson.scripts = {
        ...packageJson.scripts,
        'deploy:auto': 'bash scripts/automated-deployment.sh',
    };

    // 更新されたpackage.jsonを書き込み
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
