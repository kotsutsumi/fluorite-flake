/**
 * ルートpackage.jsonを作成するヘルパー関数
 * Monorepoのルートpackage.jsonを設定し、ワークスペース構成を設定する
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * ルートpackage.jsonの作成
 */
export async function createRootPackageJson(config: MonorepoConfig) {
    const rootPackageJson = {
        name: config.projectName,
        version: '0.0.1',
        private: true,
        workspaces: ['apps/*', 'packages/*'],
        scripts: {
            dev: config.workspaceTool === 'turborepo' ? 'turbo dev' : 'nx run-many --target=dev',
            build:
                config.workspaceTool === 'turborepo' ? 'turbo build' : 'nx run-many --target=build',
            lint: config.workspaceTool === 'turborepo' ? 'turbo lint' : 'nx run-many --target=lint',
            test: config.workspaceTool === 'turborepo' ? 'turbo test' : 'nx run-many --target=test',
            'dev:backend': `${config.packageManager} --filter=backend dev`,
            'dev:frontend': `${config.packageManager} --filter=frontend dev`,
            'build:backend': `${config.packageManager} --filter=backend build`,
            'build:frontend': `${config.packageManager} --filter=frontend build`,
            clean: 'rm -rf apps/*/node_modules packages/*/node_modules node_modules',
        },
        devDependencies: {
            ...(config.workspaceTool === 'turborepo' && { turbo: '^1.11.3' }),
            ...(config.workspaceTool === 'nx' && { nx: '^17.2.8' }),
            prettier: '^3.1.1',
            typescript: '^5.3.3',
        },
        packageManager: `${config.packageManager}@latest`,
    };

    await fs.writeJSON(path.join(config.projectPath, 'package.json'), rootPackageJson, {
        spaces: 2,
    });
}
