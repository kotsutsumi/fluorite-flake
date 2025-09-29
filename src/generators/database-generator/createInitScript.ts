import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import { readTemplateWithReplacements } from '../../utils/template-reader.js';

/**
 * Tursoデータベース用の初期化スクリプトを作成する
 * @param config プロジェクト設定
 */
export async function createInitScript(config: ProjectConfig) {
    // Turso以外のデータベースの場合はスキップ
    if (config.database !== 'turso') {
        return;
    }

    const initScriptContent = await readTemplateWithReplacements(
        'database/scripts/init-script.sh.template',
        {
            projectName: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            packageManager: config.packageManager,
            orm: config.orm || 'none',
        }
    );

    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'init-db.sh'), initScriptContent);
    await fs.chmod(path.join(scriptsDir, 'init-db.sh'), '755');

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'init:db': 'bash scripts/init-db.sh',
        'init:db:local': 'bash scripts/init-db.sh --local',
        'init:db:cloud': 'bash scripts/init-db.sh --cloud',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
