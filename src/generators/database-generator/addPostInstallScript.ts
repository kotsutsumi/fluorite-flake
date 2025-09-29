import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';

/**
 * Prisma用のpostinstallスクリプトをpackage.jsonに追加する
 * @param config プロジェクト設定
 */
export async function addPostInstallScript(config: ProjectConfig) {
    // Prismaを使用しない場合はスキップ
    if (config.orm !== 'prisma') {
        return;
    }

    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    const postinstallScript = 'prisma generate';
    if (!packageJson.scripts.postinstall) {
        packageJson.scripts.postinstall = postinstallScript;
    } else if (!packageJson.scripts.postinstall.includes('prisma generate')) {
        packageJson.scripts.postinstall = `${postinstallScript} && ${packageJson.scripts.postinstall}`;
    }

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
