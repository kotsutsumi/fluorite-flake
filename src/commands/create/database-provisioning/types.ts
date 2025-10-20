/**
 * データベースプロビジョニング関連の型定義
 * 現在は開発中のため、最小限の型定義のみを提供します
 */

/**
 * データベース資格情報
 */
export interface DatabaseCredentials {
    url?: string;
    authToken?: string;
    urls?: Record<string, string>;
    tokens?: Record<string, string>;
    [key: string]: unknown;
}

/**
 * プロビジョニング結果の基底型
 */
export interface ProvisioningResult {
    success: boolean;
    credentials?: DatabaseCredentials;
    error?: string;
    databases?: Array<{
        environment: string;
        name: string;
        url: string;
        status: string;
    }>;
}

/**
 * Supabaseプロビジョニングオプション
 */
export interface SupabaseProvisioningOptions {
    projectName: string;
    environments: Array<"dev" | "staging" | "prod">;
    region?: string;
    plan?: string;
    organizationId?: string;
    organization?: string;
}

/**
 * Tursoプロビジョニングオプション
 */
export interface TursoProvisioningOptions {
    projectName: string;
    environments: Array<"dev" | "staging" | "prod">;
    region?: string;
    group?: string;
    location?: string;
    existingNaming?: Record<string, string>;
}

// EOF
