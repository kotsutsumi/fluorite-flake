#!/usr/bin/env tsx
/**
 * Vercel Production環境用の環境変数設定スクリプト
 *
 * 本番環境の環境変数をVercelのProduction環境に適用します。
 * Turso / Supabase両方のデータベースタイプに対応しています。
 *
 * ⚠️  重要: 本番環境への変更は慎重に行ってください
 */
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import {
    readProjectConfig,
    readEnvFile,
    applyToEnvironment,
    detectDatabaseType,
    checkVercelCli,
    checkVercelAuth,
    type EnvMap,
} from './env-tools.js';

/**
 * プロジェクトルートディレクトリを取得する
 */
const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '../');

/**
 * ユーザー確認プロンプトを表示する
 */
async function confirmProduction(): Promise<boolean> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(
            '⚠️  You are about to apply variables to PRODUCTION environment.\n' +
                '   This will affect your live application.\n' +
                '   Are you sure you want to continue? (y/N): ',
            (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            }
        );
    });
}

/**
 * 環境変数を本番環境に適用する
 */
async function applyVariable(key: string, value: string, env: NodeJS.ProcessEnv): Promise<void> {
    // Production環境に適用
    await applyToEnvironment(key, value, 'production', env);
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

        // 本番環境への変更確認
        const confirmed = await confirmProduction();
        if (!confirmed) {
            console.log('❌ Operation cancelled by user.');
            process.exit(0);
        }

        // プロジェクト設定を読み込み
        console.log('📖 Reading project configuration...');
        const { orgId, projectId } = await readProjectConfig();
        const baseEnv = {
            ...process.env,
            VERCEL_ORG_ID: orgId,
            VERCEL_PROJECT_ID: projectId,
        };

        console.log('🚀 Applying PRODUCTION environment variables...');
        console.log('   ⚠️  This will affect your live application!\n');

        // 環境ファイルを読み込み
        const envPath = resolve(projectRoot, '.env.prod');
        console.log(`📁 Reading environment file: ${envPath}`);

        const envMap: EnvMap = await readEnvFile(envPath);

        if (envMap.size === 0) {
            console.warn('⚠️  No variables found in .env.prod');
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
✅ Production environment variables applied successfully!`);
        console.log('📝 Note: These changes are now live in your production environment.');
        console.log('🔍 Monitor your application for any issues after deployment.');
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
