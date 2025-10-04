/**
 * データベース設定定義
 * サポートされているデータベースサービスの設定情報
 */

import type { OrmType } from './types.js';

/**
 * データベース設定マップ
 * 各データベースサービスの詳細設定
 */
export const DATABASE_CONFIGS = {
    // Turso 設定 - エッジで動作するSQLiteデータベース
    turso: {
        name: 'Turso',
        description: 'libSQLでエッジで動作するSQLiteデータベース',
        envVars: ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'DATABASE_URL'], // 必要な環境変数
        supportedOrms: ['prisma', 'drizzle'] as OrmType[], // 対応ORM
    },
    // Supabase 設定 - 認証機能内蔵のPostgreSQLデータベース
    supabase: {
        name: 'Supabase',
        description: '認証機能内蔵のPostgreSQLデータベース',
        envVars: [
            // 必要な環境変数
            'NEXT_PUBLIC_SUPABASE_URL', // SupabaseプロジェクトURL
            'NEXT_PUBLIC_SUPABASE_ANON_KEY', // 公開用匿名キー
            'SUPABASE_SERVICE_ROLE_KEY', // サービスロールキー
            'DATABASE_URL', // データベース接続URL
        ],
        supportedOrms: ['prisma', 'drizzle'] as OrmType[], // 対応ORM
    },
} as const;
