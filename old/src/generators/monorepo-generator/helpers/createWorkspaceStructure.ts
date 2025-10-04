/**
 * Monorepoのワークスペース構造を作成するヘルパー関数
 * apps/, packages/などの基本ディレクトリ構造を作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Workspace構造を作成する
 */
export async function createWorkspaceStructure(config: MonorepoConfig) {
    const dirs = [
        path.join(config.projectPath, 'apps'),
        path.join(config.projectPath, 'packages'),
        path.join(config.projectPath, 'packages', 'graphql-types'),
        path.join(config.projectPath, 'packages', 'shared-types'),
        path.join(config.projectPath, 'packages', 'config'),
    ];

    for (const dir of dirs) {
        await fs.ensureDir(dir);
    }
}
