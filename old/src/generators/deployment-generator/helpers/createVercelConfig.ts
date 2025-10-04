/**
 * Vercel設定ファイル（vercel.json）を作成する関数
 * ビルドコマンド、環境変数、データベース、ストレージ設定を含む
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { getStorageEnvPlaceholders } from './getStorageEnvPlaceholders.js';

/**
 * Vercel設定ファイル（vercel.json）を作成する関数
 * ビルドコマンド、環境変数、データベース、ストレージ設定を含む
 * @param config プロジェクト設定
 */
export async function createVercelConfig(config: ProjectConfig) {
    // Vercel設定オブジェクトの作成
    const vercelConfig: {
        buildCommand: string;
        devCommand: string;
        installCommand: string;
        framework: string;
        outputDirectory: string;
        env: Record<string, string>;
        envFilesystem: string[];
        functions?: Record<string, unknown>;
    } = {
        buildCommand: `${config.packageManager} run build`,
        devCommand: `${config.packageManager} run dev`,
        installCommand: `${config.packageManager} install`,
        framework: 'nextjs',
        outputDirectory: '.next',
        env: {
            NODE_ENV: 'production',
        },
        envFilesystem: ['.env.production', '.env.staging', '.env.development'],
    };

    // データベースの環境変数を追加
    if (config.database === 'turso') {
        vercelConfig.env = {
            ...vercelConfig.env,
            TURSO_DATABASE_URL: '@turso_database_url',
            TURSO_AUTH_TOKEN: '@turso_auth_token',
            DATABASE_URL: '@database_url',
        };
    } else if (config.database === 'supabase') {
        vercelConfig.env = {
            ...vercelConfig.env,
            NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_anon_key',
            SUPABASE_SERVICE_ROLE_KEY: '@supabase_service_role_key',
            DATABASE_URL: '@database_url',
        };
    }

    // ストレージの環境変数を追加
    vercelConfig.env = {
        ...vercelConfig.env,
        ...getStorageEnvPlaceholders(config.storage),
    };

    // vercel.jsonファイルを書き込み
    await fs.writeJSON(path.join(config.projectPath, 'vercel.json'), vercelConfig, { spaces: 2 });
}
