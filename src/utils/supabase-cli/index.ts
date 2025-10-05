/**
 * Supabase CLI ラッパー
 *
 * Supabase CLI の全機能を TypeScript から利用するためのユーティリティモジュール
 */

// 認証関連
export {
    getLoginInfo,
    isAuthenticated,
    login,
    logout,
    whoami,
} from "./auth.js";
// データベース管理
export {
    diffDatabase,
    dumpDatabase,
    lintDatabase,
    pullDatabase,
    pushDatabase,
    resetDatabase,
    startDatabase,
} from "./database.js";
// 基本ユーティリティ
export {
    executeSupabaseCommand,
    parseJsonResponse,
    throwOnError,
} from "./executor.js";

// Edge Functions 管理
export {
    createFunction,
    deleteFunction,
    deployFunction,
    downloadFunction,
    functionExists,
    listFunctions,
    serveFunctions,
} from "./functions.js";
// マイグレーション管理
export {
    createMigration,
    downMigrations,
    fetchMigrations,
    listMigrations,
    migrationExists,
    repairMigrations,
    squashMigrations,
    upMigrations,
} from "./migrations.js";
// プロジェクト管理
export {
    createProject,
    deleteProject,
    getApiKeys,
    getProjectById,
    listProjects,
    projectExists,
} from "./projects.js";

// 型定義
export type {
    AuthInfo,
    BackupInfo,
    BackupRestoreOptions,
    BranchCreateOptions,
    BranchInfo,
    BranchUpdateOptions,
    CommandResult,
    DatabaseOptions,
    DomainCreateOptions,
    DomainInfo,
    ExecOptions,
    FunctionDeployOptions,
    FunctionInfo,
    GlobalFlags,
    JwtGenOptions,
    LoginInfo,
    LoginOptions,
    MigrationInfo,
    OrgInfo,
    ProjectCreateOptions,
    ProjectInfo,
    SecretInfo,
    SecretSetOptions,
    SupabaseCommandError,
    TypeGenOptions,
} from "./types.js";

// EOF
