#!/usr/bin/env tsx
/**
 * Vercel Staging環境用の環境変数設定スクリプト
 *
 * ステージング環境の環境変数をVercelのPreview環境に適用します。
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
 * 環境変数をプレビュー環境に適用する（STGサフィックス付き）
 */
async function applyVariable(key: string, value: string, env: NodeJS.ProcessEnv): Promise<void> {
    // Preview環境にSTGサフィックス付きで適用
    for (const previewKey of resolveEnvironmentKeys(key, 'staging')) {
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

        console.log('🚀 Applying STAGING environment variables...');
        console.log('   Using Preview environment with STG suffix\n');

        // 環境ファイルを読み込み
        const projectRoot = detectProjectRoot();
        const envPath = resolve(projectRoot, '.env.staging');
        console.log(`📁 Reading environment file: ${envPath}`);

        const envMap: EnvMap = await readEnvFile(envPath);

        if (envMap.size === 0) {
            console.warn('⚠️  No variables found in .env.staging');
            process.exit(1);
        }

        // データベースタイプを検出
        const dbType = detectDatabaseType(envMap);
        console.log(`🗃️  Detected database type: ${dbType.toUpperCase()}`);

        console.log(`\n📊 Found ${envMap.size} variables to apply:\n`);

        // 環境変数を順次適用
        for (const [key, value] of envMap) {
            console.log(`🔧 Processing ${key}...`);
            try {
                await applyVariable(key, value, baseEnv);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes('Environment "staging" was not found')) {
                    console.log(
                        `  ⚠️  Note: Custom environment 'staging' will be created automatically`
                    );
                    console.log(`     You may need to configure it in Vercel Dashboard:`);
                    console.log(`     1. Go to Project Settings > Environment Variables`);
                    console.log(`     2. Create a custom environment named 'staging'`);
                    console.log(`     3. Link it to the 'staging' branch`);
                }
                throw error;
            }
        }

        console.log(`
✅ Staging environment variables applied successfully!`);
        console.log('📝 Note: These variables are applied to Preview environment with STG suffix.');
        console.log('🎯 Use staging branch deployments to access this configuration.');
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
