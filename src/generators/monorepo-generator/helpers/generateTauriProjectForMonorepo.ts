/**
 * Monorepo用にTauriプロジェクトを生成するヘルパー関数
 * 既存のTauriジェネレーターを利用してプロジェクトを作成する
 */

import { generateTauriProject } from '../../tauri-generator/index.js';
import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Monorepo用にTauriプロジェクトを生成
 */
export async function generateTauriProjectForMonorepo(config: MonorepoConfig) {
    await generateTauriProject(config);
}
