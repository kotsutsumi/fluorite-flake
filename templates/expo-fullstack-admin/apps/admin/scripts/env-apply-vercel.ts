#!/usr/bin/env tsx
/**
 * Vercel Development環境用の環境変数設定スクリプト
 *
 * 開発環境の環境変数をVercelのDevelopment環境に適用します。
 * Turso / Supabase両方のデータベースタイプに対応しています。
 */
import { resolve } from 'node:path';

import {
    readProjectConfig,
    readEnvFile,
    applyToEnvironment,
    detectDatabaseType,
    checkVercelCli,
    checkVercelAuth,
    resolveEnvironmentKeys,
    detectProjectRoot,
    type EnvMap,
} from './env-tools.js';

/**
 * 環境変数を開発環境とプレビュー環境に適用する
 */
async function applyVariable(key: string, value: string, env: NodeJS.ProcessEnv): Promise<void> {
    const keysToApply = resolveEnvironmentKeys(key, 'development');

    // Development環境に適用（サフィックス付きの複製も含める）
    for (const targetKey of keysToApply) {
        await applyToEnvironment(targetKey, value, 'development', env);
    }

    // Preview環境にも同じ値を適用（DEVサフィックス付きも含める）
    for (const previewKey of keysToApply) {
        await applyToEnvironment(previewKey, value, 'preview', env);
    }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
    try {
        // 前提条件チェック
        console.log('🔍 Checking prerequisites...');
        await checkVercelCli();
        await checkVercelAuth();

        // プロジェクト設定を読み込み
        console.log('📖 Reading project configuration...');
        const { orgId, projectId } = await readProjectConfig();
        const baseEnv = {
            ...process.env,
            VERCEL_ORG_ID: orgId,
            VERCEL_PROJECT_ID: projectId,
        };

        console.log('🚀 Applying DEVELOPMENT environment variables...');
        console.log('   Using Development environment and mirroring to Preview\n');

        // 環境ファイルを読み込み
        const projectRoot = detectProjectRoot();
        const envPath = resolve(projectRoot, '.env.development');
        console.log(`📁 Reading environment file: ${envPath}`);

        const envMap: EnvMap = await readEnvFile(envPath);

        if (envMap.size === 0) {
            console.warn('⚠️  No variables found in .env.development');
            process.exit(1);
        }

        // データベースタイプを検出
        const dbType = detectDatabaseType(envMap);
        console.log(`🗃️  Detected database type: ${dbType.toUpperCase()}`);

        console.log(`\n📊 Found ${envMap.size} variables to apply:\n`);

        // 環境変数を順次適用
        for (const [key, value] of envMap) {
            console.log(`🔧 Processing ${key}...`);
            await applyVariable(key, value, baseEnv);
        }

        console.log(`
✅ Development environment variables applied successfully!`);
        console.log('📝 Note: These variables are applied to Development and mirrored to Preview.');
        console.log('🎯 Staging and Production use their own custom environments.');
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
    }
}

// スクリプトが直接実行された場合のみmain関数を実行
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

// EOF
