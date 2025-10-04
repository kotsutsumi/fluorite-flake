import type { ProjectConfig } from '../../commands/create/types.js';
import { createScopedLogger } from '../../utils/logger.js';
import { createStorybookConfig } from './helpers/createStorybookConfig.js';
import { createStorybookMain } from './helpers/createStorybookMain.js';
import { createStorybookPreview } from './helpers/createStorybookPreview.js';
import { createStorybookManager } from './helpers/createStorybookManager.js';
import { createExampleStories } from './helpers/createExampleStories.js';
import { setupStorybookScripts } from './helpers/setupStorybookScripts.js';
import { createStorybookTests } from './helpers/createStorybookTests.js';

/**
 * Storybookセットアップメイン関数
 * Next.jsプロジェクト用のStorybook 8.x設定、コンポーネントストーリー、Playwright統合を実装
 */

// Storybook用のスコープ付きロガーを作成
const logger = createScopedLogger('storybook');

/**
 * Storybookをセットアップするメイン関数
 * Next.jsプロジェクト用のStorybook 8.x設定、コンポーネントストーリー、Playwright統合を実装
 * @param config プロジェクト設定
 */
export async function setupStorybook(config: ProjectConfig) {
    // Storybookが有効でかつNext.jsプロジェクトのみ処理
    if (!config.storybook || config.framework !== 'nextjs') {
        return;
    }

    logger.step('Setting up Storybook with modern configuration...');

    // Storybookの各種設定ファイルとコンポーネントを作成
    await createStorybookConfig(config); // メイン設定ファイル
    await createStorybookMain(config); // メイン設定（代替）
    await createStorybookPreview(config); // プレビュー設定
    await createStorybookManager(config); // マネージャー設定
    await createExampleStories(config); // サンプルストーリー
    await setupStorybookScripts(config); // スクリプトと依存関係
    await createStorybookTests(config); // テスト設定

    logger.success('Storybook configured with Playwright integration');
}
