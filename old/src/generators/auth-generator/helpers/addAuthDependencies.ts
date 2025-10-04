import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Better Auth に必要な依存関係を追加する
 * package.json の dependencies と devDependencies を更新
 */
export async function addAuthDependencies(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    packageJson.dependencies = packageJson.dependencies ?? {};

    if (!packageJson.dependencies['better-auth']) {
        packageJson.dependencies['better-auth'] = '^1.2.3';
    }

    if (!packageJson.dependencies.zod) {
        packageJson.dependencies.zod = '^3.23.8';
    }

    if (!packageJson.dependencies.bcryptjs) {
        packageJson.dependencies.bcryptjs = '^2.4.3';
    }

    // 型定義用の開発依存関係を追加
    packageJson.devDependencies = packageJson.devDependencies ?? {};
    if (!packageJson.devDependencies['@types/bcryptjs']) {
        packageJson.devDependencies['@types/bcryptjs'] = '^2.4.6';
    }

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
