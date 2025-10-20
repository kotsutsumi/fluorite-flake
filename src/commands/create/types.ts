/**
 * createコマンド関連の型定義
 * 現在は開発中のため、最小限の型定義のみを提供します
 */

/**
 * プロジェクトタイプ
 */
export type ProjectType = "nextjs" | "expo" | "tauri";

/**
 * データベースタイプ
 */
export type DatabaseType = "turso" | "supabase" | "sqlite" | "none";

/**
 * プロジェクト設定
 */
export interface ProjectConfig {
	projectName: string;
	projectType: ProjectType;
	template: string;
	directory: string;
	database?: DatabaseType;
	isMonorepoMode?: boolean;
	pnpmVersion?: string;
	name?: string;
	type?: string;
	monorepo?: boolean;
	shouldGenerateDocs?: boolean;
}

// EOF
