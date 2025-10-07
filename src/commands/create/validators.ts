/**
 * createコマンドのバリデーション関数
 */
import { getMessages } from "../../i18n.js";
import { PROJECT_TEMPLATES } from "./constants.js";
import type { DatabaseType, ProjectType } from "./types.js";

/**
 * プロジェクトタイプの検証
 */
export function validateProjectType(type: string): type is ProjectType {
    return type in PROJECT_TEMPLATES;
}

/**
 * プロジェクトタイプ用テンプレートの検証
 */
export function validateTemplate(type: ProjectType, template: string): boolean {
    return (PROJECT_TEMPLATES[type] as readonly string[]).includes(template);
}

/**
 * フルスタックテンプレートかどうかを判定
 */
export function isFullStackTemplate(template: string): boolean {
    return template.includes("fullstack") || template.includes("admin");
}

/**
 * 認証機能を含むテンプレートかどうかを判定
 */
export function hasAuthenticationFeature(template: string): boolean {
    return template.includes("admin") || template.includes("fullstack");
}

/**
 * データベース統合を含むテンプレートかどうかを判定
 */
export function hasDatabaseFeature(template: string): boolean {
    return template.includes("admin") || template.includes("fullstack");
}

/**
 * モノレポ構造が推奨されるテンプレートかどうかを判定
 */
export function isMonorepoRecommended(template: string): boolean {
    return (
        template.includes("fullstack") ||
        template.includes("cross-platform") ||
        template.includes("desktop-admin")
    );
}

/**
 * データベースタイプの検証
 */
export function validateDatabase(database: string): database is DatabaseType {
    const validDatabases: DatabaseType[] = ["turso", "supabase", "sqlite"];
    return validDatabases.includes(database as DatabaseType);
}

/**
 * データベースタイプが無効な場合、エラーメッセージを表示
 */
export function showInvalidDatabaseError(database: string): void {
    const { create } = getMessages();
    console.error(create.invalidDatabase(database));
    console.error(create.availableDatabases);
}

// EOF
