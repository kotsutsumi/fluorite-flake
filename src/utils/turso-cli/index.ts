/**
 * Turso CLI Node.js ラッパー
 *
 * Turso CLIを直接nodeから利用する際のシェル実行エラー処理などの
 * 煩雑さを回避するためのラッパーモジュール
 */

// 認証関連
export {
    createApiToken,
    getToken,
    isAuthenticated,
    listApiTokens,
    login,
    loginHeadless,
    logout,
    revokeApiToken,
    signup,
    whoami,
} from "./auth.js";
// データベース関連
export {
    createDatabase,
    createDatabaseToken,
    destroyDatabase,
    exportDatabase,
    getDatabaseUrl,
    getLocations,
    importDatabase,
    inspectDatabase,
    invalidateDatabaseTokens,
    listDatabases,
    shellDatabase,
    showDatabase,
    unarchiveDatabase,
} from "./database.js";

// 基本実行ユーティリティ
export {
    executeTursoCommand,
    parseJsonResponse,
    throwOnError,
} from "./executor.js";
// グループ関連
export {
    abortAwsMigration,
    addGroupLocation,
    createGroup,
    createGroupToken,
    destroyGroup,
    getAwsMigrationInfo,
    invalidateGroupTokens,
    listGroups,
    removeGroupLocation,
    startAwsMigration,
    transferGroup,
    unarchiveGroup,
    updateGroup,
} from "./group.js";
// 組織関連
export {
    addMember,
    createOrganization,
    destroyOrganization,
    inviteMember,
    listMembers,
    listOrganizations,
    removeMember,
    switchOrganization,
} from "./organization.js";
// プラン・その他
export {
    bookMeeting,
    disableOverages,
    enableOverages,
    getVersion,
    selectPlan,
    sendFeedback,
    showHelp,
    showPlan,
    startDevServer,
    updateCli,
    upgradePlan,
} from "./plan.js";
// 型定義
export type {
    AuthTokenInfo,
    CommandResult,
    DatabaseCreateOptions,
    DatabaseInfo,
    DatabaseToken,
    ExecOptions,
    GroupCreateOptions,
    GroupInfo,
    MemberInfo,
    OrganizationInfo,
    UserInfo,
} from "./types.js";
export { TursoCliError } from "./types.js";

// EOF
