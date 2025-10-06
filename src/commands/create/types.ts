/**
 * createコマンドの型定義
 */
import type { BlobConfiguration } from "../../utils/vercel-cli/blob-types.js";
import type {
    PROJECT_TEMPLATES,
    PROJECT_TYPE_DESCRIPTIONS,
} from "./constants.js";
import type {
    DatabaseCredentials,
    DatabaseProvisioningConfig,
} from "./database-provisioning/types.js";

/**
 * データベースタイプの型
 */
export type DatabaseType = "turso" | "supabase";

/**
 * createコマンドのオプション型
 */
export type CreateOptions = {
    name?: string;
    template?: string;
    force?: boolean;
    dir?: string;
    monorepo?: boolean;
    simple?: boolean;
    database?: DatabaseType;
};

/**
 * プロジェクトタイプの型
 */
export type ProjectType = keyof typeof PROJECT_TEMPLATES;

/**
 * テンプレートタイプの型
 */
export type TemplateType<T extends ProjectType> =
    (typeof PROJECT_TEMPLATES)[T][number];

/**
 * プロジェクト設定の型
 */
export type ProjectConfig = {
    type: ProjectType;
    name: string;
    directory: string;
    template?: string;
    force: boolean;
    monorepo: boolean;
    database?: DatabaseType;
    databaseConfig?: DatabaseProvisioningConfig;
    databaseCredentials?: DatabaseCredentials;
    blobConfig?: BlobConfiguration;
};

/**
 * 拡張プロジェクト設定の型（追加情報付き）
 */
export type ExtendedProjectConfig = ProjectConfig & {
    description?: string;
    templateDescription?: string;
    isFullStack?: boolean;
    hasAuthentication?: boolean;
    hasDatabase?: boolean;
    framework?: string;
    features?: string[];
};

/**
 * プロジェクトタイプ説明の型
 */
export type ProjectTypeDescription = typeof PROJECT_TYPE_DESCRIPTIONS;

// EOF
