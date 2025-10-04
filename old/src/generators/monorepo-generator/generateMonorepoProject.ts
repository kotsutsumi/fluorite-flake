/**
 * Monorepoプロジェクト生成のメイン関数
 * 全体的なワークフローを制御し、各ヘルパー関数を呼び出してMonorepoプロジェクトを構築する
 */

import path from 'node:path';
import fs from 'fs-extra';

import { isProvisioningEligible, provisionCloudResources } from '../../utils/cloud/index.js';
import { createScopedLogger } from '../../utils/logger.js';
import { setupAuth } from '../auth-generator/index.js';
import { setupDatabase } from '../database-generator/index.js';
import { setupDeployment } from '../deployment-generator/index.js';
import { setupStorage } from '../storage-generator/index.js';
import { createRootPackageJson } from './helpers/createRootPackageJson.js';
import { createSharedPackages } from './helpers/createSharedPackages.js';
import { createWorkspaceConfig } from './helpers/createWorkspaceConfig.js';
import { createWorkspaceStructure } from './helpers/createWorkspaceStructure.js';
import { generateExpoProjectForMonorepo } from './helpers/generateExpoProjectForMonorepo.js';
import { generateFlutterProjectForMonorepo } from './helpers/generateFlutterProjectForMonorepo.js';
import { generateNextProjectForMonorepo } from './helpers/generateNextProjectForMonorepo.js';
import { generateTauriProjectForMonorepo } from './helpers/generateTauriProjectForMonorepo.js';
import { setupDevelopmentScripts } from './helpers/setupDevelopmentScripts.js';
import { setupGraphQLBackend } from './helpers/setupGraphQLBackend.js';
import { setupGraphQLClient } from './helpers/setupGraphQLClient.js';
import type { MonorepoConfig } from './types/MonorepoConfig.js';

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

    // ルートpackage.jsonの生成（backend/frontend生成前に作成）
    await createRootPackageJson(config);

    // Workspace設定ファイルの生成
    await createWorkspaceConfig(config);

    // Backend/Frontend用の正しいプロジェクトパスを設定
    if (config.backendConfig) {
        config.backendConfig.projectPath = path.join(config.projectPath, 'apps', 'backend');
    }
    if (config.frontendConfig) {
        config.frontendConfig.projectPath = path.join(config.projectPath, 'apps', 'frontend');
    }

    // Backend (Next.js) の生成
    if (config.includeBackend && config.backendConfig) {
        logger.info('Generating backend (Next.js) application...');
        await generateNextProjectForMonorepo(config);

        // データベースセットアップ（API エンドポイントを含む）
        if (config.backendConfig.database !== 'none') {
            await setupDatabase(config.backendConfig);
        }

        // ストレージセットアップ
        if (config.backendConfig.storage && config.backendConfig.storage !== 'none') {
            await setupStorage(config.backendConfig);
        }

        // デプロイメントセットアップ
        if (config.backendConfig.deployment) {
            await setupDeployment(config.backendConfig);
        }

        // クラウドリソースのプロビジョニング
        if (isProvisioningEligible(config.backendConfig)) {
            await provisionCloudResources(config.backendConfig);
        }

        // 認証セットアップ
        if (config.backendConfig.auth) {
            await setupAuth(config.backendConfig);
        }

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

    // 開発スクリプトの追加
    await setupDevelopmentScripts(config);

    logger.success('Monorepo project created successfully!');
}
