/**
 * Workspace設定ファイルを作成するヘルパー関数
 * Turborepo、NX、PNPM Workspaceの設定ファイルを作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Workspace設定ファイルの作成
 */
export async function createWorkspaceConfig(config: MonorepoConfig) {
    if (config.workspaceTool === 'turborepo') {
        const turboConfig = {
            $schema: 'https://turbo.build/schema.json',
            globalDependencies: ['**/.env.*local'],
            pipeline: {
                build: {
                    dependsOn: ['^build'],
                    outputs: ['.next/**', '!.next/cache/**', 'dist/**'],
                },
                dev: {
                    cache: false,
                    persistent: true,
                },
                lint: {},
                test: {},
            },
        };
        await fs.writeJSON(path.join(config.projectPath, 'turbo.json'), turboConfig, { spaces: 2 });
    } else if (config.workspaceTool === 'nx') {
        const nxConfig = {
            extends: 'nx/presets/npm.json',
            tasksRunnerOptions: {
                default: {
                    runner: 'nx/tasks-runners/default',
                    options: {
                        cacheableOperations: ['build', 'lint', 'test'],
                    },
                },
            },
        };
        await fs.writeJSON(path.join(config.projectPath, 'nx.json'), nxConfig, { spaces: 2 });
    }

    // PNPM workspace設定（PNPM使用時）
    if (config.packageManager === 'pnpm') {
        const pnpmWorkspace = `packages:
  - 'apps/*'
  - 'packages/*'
`;
        await fs.writeFile(path.join(config.projectPath, 'pnpm-workspace.yaml'), pnpmWorkspace);
    }
}
