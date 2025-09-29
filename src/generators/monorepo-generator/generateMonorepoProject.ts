/**
 * Monorepoプロジェクト生成のメイン関数
 * 全体的なワークフローを制御し、各ヘルパー関数を呼び出してMonorepoプロジェクトを構築する
 */

import fs from 'fs-extra';

import { createScopedLogger } from '../../utils/logger.js';
import type { MonorepoConfig } from './types/MonorepoConfig.js';
import { createWorkspaceStructure } from './helpers/createWorkspaceStructure.js';
import { generateNextProjectForMonorepo } from './helpers/generateNextProjectForMonorepo.js';
import { setupGraphQLBackend } from './helpers/setupGraphQLBackend.js';
import { generateExpoProjectForMonorepo } from './helpers/generateExpoProjectForMonorepo.js';
import { generateFlutterProjectForMonorepo } from './helpers/generateFlutterProjectForMonorepo.js';
import { generateTauriProjectForMonorepo } from './helpers/generateTauriProjectForMonorepo.js';
import { setupGraphQLClient } from './helpers/setupGraphQLClient.js';
import { createSharedPackages } from './helpers/createSharedPackages.js';
import { createRootPackageJson } from './helpers/createRootPackageJson.js';
import { createWorkspaceConfig } from './helpers/createWorkspaceConfig.js';
import { setupDevelopmentScripts } from './helpers/setupDevelopmentScripts.js';

// Monorepoジェネレーター用のロガーを作成
const logger = createScopedLogger('monorepo');

/**
 * Monorepoプロジェクトを生成するメイン関数
 * @param config Monorepo設定
 */
export async function generateMonorepoProject(config: MonorepoConfig) {
    logger.info('Creating monorepo project structure...');

    // プロジェクトディレクトリの確保
    await fs.ensureDir(config.projectPath);

    // Workspace構成の作成
    await createWorkspaceStructure(config);

    // Backend (Next.js) の生成
    if (config.includeBackend && config.backendConfig) {
        logger.info('Generating backend (Next.js) application...');
        await generateNextProjectForMonorepo(config);
        await setupGraphQLBackend(config);
    }

    // Frontend の生成
    if (config.frontendConfig) {
        logger.info(`Generating frontend (${config.frontendFramework}) application...`);

        switch (config.frontendFramework) {
            case 'expo':
                await generateExpoProjectForMonorepo(config);
                break;
            case 'flutter':
                await generateFlutterProjectForMonorepo(config);
                break;
            case 'tauri':
                await generateTauriProjectForMonorepo(config);
                break;
        }

        await setupGraphQLClient(config, config.frontendFramework);
    }

    // 共有パッケージの作成
    await createSharedPackages(config);

    // ルートpackage.jsonの生成
    await createRootPackageJson(config);

    // Workspace設定ファイルの生成
    await createWorkspaceConfig(config);

    // 開発スクリプトの追加
    await setupDevelopmentScripts(config);

    logger.success('Monorepo project created successfully!');
}
