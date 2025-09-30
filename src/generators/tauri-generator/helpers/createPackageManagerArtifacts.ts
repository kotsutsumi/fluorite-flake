import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * テストモードでは依存関係のインストールをスキップするため、
 * npm / Yarn / Bun 向けに最低限のロックファイルを生成しておくヘルパー。
 * これによりシナリオテストが期待する成果物を満たせる。
 */
export async function createPackageManagerArtifacts(config: ProjectConfig) {
    const projectDir = config.projectPath;

    switch (config.packageManager) {
        case 'npm': {
            const lockPath = path.join(projectDir, 'package-lock.json');
            if (await fs.pathExists(lockPath)) {
                break;
            }

            // npm ci が動作するよう最低限の情報を含めたロックファイルを作成
            const placeholderLock = {
                name: config.projectName,
                version: '0.0.0',
                lockfileVersion: 3,
                requires: true,
                packages: {},
            };

            await fs.writeJSON(lockPath, placeholderLock, { spaces: 2 });
            break;
        }
        case 'yarn': {
            const lockPath = path.join(projectDir, 'yarn.lock');
            if (await fs.pathExists(lockPath)) {
                break;
            }

            const placeholderContent =
                '# このロックファイルはテスト用のプレースホルダーです\n# 実際の開発では yarn install を実行し最新状態を反映してください\n';
            await fs.writeFile(lockPath, placeholderContent);
            break;
        }
        case 'bun': {
            const lockPath = path.join(projectDir, 'bun.lockb');
            if (await fs.pathExists(lockPath)) {
                break;
            }

            await fs.writeFile(lockPath, Buffer.alloc(0));
            break;
        }
        default: {
            // pnpm などはテストモードでもロックファイル検証を行わないため生成不要
            break;
        }
    }
}
