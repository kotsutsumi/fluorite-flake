/**
 * テンプレートジェネレーターの型定義
 */

import type { BlobConfiguration } from "../../../utils/vercel-cli/blob-types.js";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
} from "../database-provisioning/types.js";
import type { ExtendedProjectConfig } from "../types.js";

/**
 * 生成コンテキスト
 */
export type GenerationContext = {
    config: ExtendedProjectConfig;
    targetDirectory: string;
    useMonorepo: boolean;
    databaseConfig?: DatabaseProvisioningConfig;
    databaseCredentials?: DatabaseCredentials;
    blobConfig?: BlobConfiguration;
};

/**
 * テンプレート生成結果
 */
export type TemplateGenerationResult = {
    success: boolean;
    filesCreated: string[];
    directoriesCreated: string[];
    nextSteps: string[];
    errors?: string[];
};

/**
 * ファイル生成情報
 */
export type FileGenerationInfo = {
    path: string;
    content: string;
    isExecutable?: boolean;
};

/**
 * ディレクトリ構造定義
 */
export type DirectoryStructure = {
    [key: string]: DirectoryStructure | null;
};

// EOF
