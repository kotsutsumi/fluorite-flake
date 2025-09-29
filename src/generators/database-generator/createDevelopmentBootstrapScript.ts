import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import { readTemplateWithReplacements } from '../../utils/template-reader.js';

/**
 * 開発環境用のブートストラップスクリプトを作成する
 * データベースの初期化とセットアップを自動化するスクリプト
 * @param config プロジェクト設定
 */
export async function createDevelopmentBootstrapScript(config: ProjectConfig) {
    // データベースやORMが指定されていない場合はスキップ
    if (config.database === 'none' || !config.orm) {
        return;
    }

    const devBootstrapContent = await readTemplateWithReplacements(
        'database/scripts/dev-bootstrap.sh.template',
        {
            packageManager: config.packageManager,
            orm: config.orm,
            database: config.database,
        }
    );

    const devBootstrapPath = path.join(config.projectPath, 'dev-bootstrap.js');
    await fs.writeFile(devBootstrapPath, devBootstrapContent);
}
