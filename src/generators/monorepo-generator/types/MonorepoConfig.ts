/**
 * Monorepoジェネレーター用の設定インターフェース
 * ProjectConfigを継承し、Monorepo固有の設定プロパティを定義
 */

import type { ProjectConfig } from '../../../commands/create/types.js';

export interface MonorepoConfig extends ProjectConfig {
    isMonorepo: true;
    workspaceTool: 'turborepo' | 'nx' | 'pnpm-workspace';
    includeBackend: boolean;
    frontendFramework: 'expo' | 'flutter' | 'tauri';
    backendConfig?: ProjectConfig;
    frontendConfig?: ProjectConfig;
}
