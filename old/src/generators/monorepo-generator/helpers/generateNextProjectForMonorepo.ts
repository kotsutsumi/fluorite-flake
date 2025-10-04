/**
 * Monorepo用にNext.jsプロジェクトを生成するヘルパー関数
 * GraphQL対応の設定を追加して既存のNext.jsジェネレーターを呼び出す
 */

import { generateNextProject } from '../../next-generator/index.js';
import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Monorepo用にNext.jsプロジェクトを生成
 */
export async function generateNextProjectForMonorepo(config: MonorepoConfig) {
    if (!config.backendConfig) {
        throw new Error('Backend config is required for monorepo Next.js project generation');
    }

    // GraphQL対応の設定を追加
    const enhancedConfig = {
        ...config.backendConfig,
        graphql: true,
        adminPanel: true,
    };

    // 既存のNext.jsジェネレーターを利用
    await generateNextProject(enhancedConfig);
}
