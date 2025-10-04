/**
 * Monorepo用にFlutterプロジェクトを生成するヘルパー関数
 * 既存のFlutterジェネレーターを利用してプロジェクトを作成する
 */

import { generateFlutterProject } from '../../flutter-generator/index.js';
import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * Monorepo用にFlutterプロジェクトを生成
 */
export async function generateFlutterProjectForMonorepo(config: MonorepoConfig) {
    await generateFlutterProject(config);
}
