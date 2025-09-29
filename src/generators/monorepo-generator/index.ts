/**
 * Monorepoジェネレーターのメインエクスポート
 * 全ての公開APIを再エクスポートする
 */

// メイン関数
export { generateMonorepoProject } from './generateMonorepoProject.js';

// 型定義
export type { MonorepoConfig } from './types/MonorepoConfig.js';

// ヘルパー関数（必要に応じて）
export { createWorkspaceStructure } from './helpers/createWorkspaceStructure.js';
export { generateNextProjectForMonorepo } from './helpers/generateNextProjectForMonorepo.js';
export { setupGraphQLBackend } from './helpers/setupGraphQLBackend.js';
export { createGraphQLFiles } from './helpers/createGraphQLFiles.js';
export { generateExpoProjectForMonorepo } from './helpers/generateExpoProjectForMonorepo.js';
export { generateFlutterProjectForMonorepo } from './helpers/generateFlutterProjectForMonorepo.js';
export { generateTauriProjectForMonorepo } from './helpers/generateTauriProjectForMonorepo.js';
export { setupGraphQLClient } from './helpers/setupGraphQLClient.js';
export { setupExpoGraphQLClient } from './helpers/setupExpoGraphQLClient.js';
export { setupFlutterGraphQLClient } from './helpers/setupFlutterGraphQLClient.js';
export { setupTauriGraphQLClient } from './helpers/setupTauriGraphQLClient.js';
export { createSharedPackages } from './helpers/createSharedPackages.js';
export { createRootPackageJson } from './helpers/createRootPackageJson.js';
export { createWorkspaceConfig } from './helpers/createWorkspaceConfig.js';
export { setupDevelopmentScripts } from './helpers/setupDevelopmentScripts.js';
