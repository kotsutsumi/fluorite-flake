/**
 * Next.jsプロジェクトを生成するメイン関数
 * プロジェクト構造の作成、依存関係のセットアップ、設定ファイルの生成などを統合的に管理
 */

import fs from 'fs-extra';
import type { ProjectConfig } from '../../commands/create/types.js';
import { generatePackageJson } from '../../utils/package-json.js';
import { createScopedLogger } from '../../utils/logger.js';
import {
    createNextAppStructure,
    setupTypeScript,
    setupTailwind,
    setupLinters,
    createNextjsConfig,
    setupMinimalUILibraries,
    installDependencies,
    setupUILibraries,
    setupStateManagement,
    setupHooks,
    setupHusky,
    createInitialPages,
    createEnvToolkitScripts,
} from './helpers/index.js';

// Next.jsジェネレーター用のロガーを作成
const logger = createScopedLogger('next');

/**
 * Next.jsプロジェクトを生成するメイン関数
 * プロジェクト構造の作成、依存関係のセットアップ、設定ファイルの生成などを行う
 * @param config プロジェクト設定
 */
export async function generateNextProject(config: ProjectConfig): Promise<void> {
    // プロジェクトディレクトリの確保
    await fs.ensureDir(config.projectPath);

    // モード設定の確認
    const isMinimal = config.mode === 'minimal';
    const isTestMode = process.env.FLUORITE_TEST_MODE === 'true';

    // 基本的なプロジェクト構造の作成
    await createNextAppStructure(config);
    await generatePackageJson(config);
    await setupTypeScript(config);
    await setupTailwind(config);
    await setupLinters(config);
    await createNextjsConfig(config);

    // モードに応じたUI設定
    if (isMinimal) {
        await setupMinimalUILibraries(config);
    } else {
        if (isTestMode) {
            logger.info('テストモードのため依存関係のインストールをスキップ');
        } else {
            await installDependencies(config);
        }
        await setupUILibraries(config);
    }

    // 状態管理とフックのセットアップ
    await setupStateManagement(config);
    await setupHooks(config);

    // ミニマルモード以外ではGitフックを設定
    if (!isMinimal) {
        await setupHusky(config);
    }

    // 初期ページと環境設定スクリプトの作成
    await createInitialPages(config);
    await createEnvToolkitScripts(config);
}
