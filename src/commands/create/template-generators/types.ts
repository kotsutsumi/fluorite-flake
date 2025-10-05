/**
 * テンプレートジェネレーターの型定義
 */
import type { ExtendedProjectConfig } from "../types.js";

/**
 * 生成コンテキスト
 */
export type GenerationContext = {
    config: ExtendedProjectConfig;
    targetDirectory: string;
    isJavaScript: boolean;
    useMonorepo: boolean;
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
