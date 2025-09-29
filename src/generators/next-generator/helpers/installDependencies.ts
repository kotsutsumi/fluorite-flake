/**
 * npmパッケージの依存関係をインストールするヘルパー関数
 * プロジェクトに必要なパッケージをインストールする
 */

import { execa } from 'execa';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { createScopedLogger } from '../../../utils/logger.js';

const logger = createScopedLogger('next');

/**
 * npmパッケージの依存関係をインストールする
 * @param config プロジェクト設定
 */
export async function installDependencies(config: ProjectConfig): Promise<void> {
    logger.step('依存関係をインストール中...');

    try {
        await execa(config.packageManager, ['install'], {
            cwd: config.projectPath,
            stdio: 'inherit',
        });
    } catch (error) {
        throw new Error(`依存関係のインストールに失敗: ${(error as Error).message}`);
    }
}
