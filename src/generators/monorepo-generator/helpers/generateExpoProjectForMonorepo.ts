/**
 * Monorepo用にExpoプロジェクトを生成するヘルパー関数
 * 既存のExpoジェネレーターを利用してプロジェクトを作成する
 */

import { generateExpoProject } from '../../expo-generator/index.js';
import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Monorepo用にExpoプロジェクトを生成
 */
export async function generateExpoProjectForMonorepo(config: MonorepoConfig) {
    await generateExpoProject(config);
}
