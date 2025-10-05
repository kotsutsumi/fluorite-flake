#!/usr/bin/env tsx
/**
 * Vercel環境変数クリアスクリプト
 *
 * 指定したVercel環境の環境変数をクリアします。
 * データベースの種別に応じて適切な環境変数をクリアします。
 */
import { createInterface } from 'node:readline';
import {
    readProjectConfig,
    clearEnvironmentVariables,
    checkVercelCli,
    checkVercelAuth,
    type VercelEnvironmentType,
} from './env-tools.js';

/**
 * Turso用環境変数一覧
 */
const TURSO_VARIABLES = [
    'TURSO_DATABASE_URL_DEV',
    'TURSO_DATABASE_URL_STG',
    'TURSO_DATABASE_URL_PROD',
    'TURSO_AUTH_TOKEN_DEV',
    'TURSO_AUTH_TOKEN_STG',
    'TURSO_AUTH_TOKEN_PROD',
    'DATABASE_URL_DEV',
    'DATABASE_URL_STG',
    'DATABASE_URL_PROD',
];

/**
 * Supabase用環境変数一覧
 */
const SUPABASE_VARIABLES = [
    'NEXT_PUBLIC_SUPABASE_URL_DEV',
    'NEXT_PUBLIC_SUPABASE_URL_STG',
    'NEXT_PUBLIC_SUPABASE_URL_PROD',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY_DEV',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY_STG',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD',
    'SUPABASE_SERVICE_ROLE_KEY_DEV',
    'SUPABASE_SERVICE_ROLE_KEY_STG',
    'SUPABASE_SERVICE_ROLE_KEY_PROD',
    'DATABASE_URL_DEV',
    'DATABASE_URL_STG',
    'DATABASE_URL_PROD',
];

/**
 * 共通環境変数一覧
 */
const COMMON_VARIABLES = [
    'NODE_ENV_DEV',
    'NODE_ENV_STG',
    'NODE_ENV_PROD',
    'NEXT_PUBLIC_ENV_DEV',
    'NEXT_PUBLIC_ENV_STG',
    'NEXT_PUBLIC_ENV_PROD',
    'NEXT_PUBLIC_APP_URL_DEV',
    'NEXT_PUBLIC_APP_URL_STG',
    'NEXT_PUBLIC_APP_URL_PROD',
    'BETTER_AUTH_URL_DEV',
    'BETTER_AUTH_URL_STG',
    'BETTER_AUTH_URL_PROD',
    'BETTER_AUTH_SECRET_DEV',
    'BETTER_AUTH_SECRET_STG',
    'BETTER_AUTH_SECRET_PROD',
    'BLOB_READ_WRITE_TOKEN_DEV',
    'BLOB_READ_WRITE_TOKEN_STG',
    'BLOB_READ_WRITE_TOKEN_PROD',
    'BLOB_STORE_ID_DEV',
    'BLOB_STORE_ID_STG',
    'BLOB_STORE_ID_PROD',
];

/**
 * 環境タイプを選択する
 */
async function selectEnvironment(): Promise<VercelEnvironmentType> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        console.log('🎯 Select the Vercel environment to clear:');
        console.log('   1) development');
        console.log('   2) preview');
        console.log('   3) production');
        console.log('');

        rl.question('Enter your choice (1-3): ', (answer) => {
            rl.close();

            switch (answer.trim()) {
                case '1':
                    resolve('development');
                    break;
                case '2':
                    resolve('preview');
                    break;
                case '3':
                    resolve('production');
                    break;
                default:
                    console.log('❌ Invalid choice. Exiting.');
                    process.exit(1);
            }
        });
    });
}

/**
 * データベースタイプを選択する
 */
async function selectDatabaseType(): Promise<'turso' | 'supabase' | 'both'> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        console.log('🗃️  Select the database type to clear:');
        console.log('   1) Turso only');
        console.log('   2) Supabase only');
        console.log('   3) Both Turso and Supabase');
        console.log('   4) Common variables only');
        console.log('');

        rl.question('Enter your choice (1-4): ', (answer) => {
            rl.close();

            switch (answer.trim()) {
                case '1':
                    resolve('turso');
                    break;
                case '2':
                    resolve('supabase');
                    break;
                case '3':
                    resolve('both');
                    break;
                case '4':
                    resolve('both'); // 共通変数のみは'both'として扱い、後でフィルタリング
                    break;
                default:
                    console.log('❌ Invalid choice. Exiting.');
                    process.exit(1);
            }
        });
    });
}

/**
 * 確認プロンプトを表示する
 */
async function confirmClear(
    environment: VercelEnvironmentType,
    variableCount: number
): Promise<boolean> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        const warning =
            environment === 'production'
                ? '⚠️  WARNING: This will affect your PRODUCTION environment!\n'
                : '';

        rl.question(
            `${warning}🗑️  About to clear ${variableCount} variables from ${environment} environment.\n` +
                '   This action cannot be undone.\n' +
                '   Are you sure you want to continue? (y/N): ',
            (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            }
        );
    });
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

        // 環境とデータベースタイプを選択
        const environment = await selectEnvironment();
        const dbType = await selectDatabaseType();

        // クリア対象の環境変数を決定
        let variablesToClear: string[] = [...COMMON_VARIABLES];

        if (dbType === 'turso') {
            variablesToClear.push(...TURSO_VARIABLES);
        } else if (dbType === 'supabase') {
            variablesToClear.push(...SUPABASE_VARIABLES);
        } else if (dbType === 'both') {
            variablesToClear.push(...TURSO_VARIABLES, ...SUPABASE_VARIABLES);
        }

        // 重複を除去
        variablesToClear = [...new Set(variablesToClear)];

        console.log(`\n📋 Variables to clear from ${environment} environment:`);
        console.log(`   Database type: ${dbType}`);
        console.log(`   Variable count: ${variablesToClear.length}`);

        // 確認プロンプト
        const confirmed = await confirmClear(environment, variablesToClear.length);
        if (!confirmed) {
            console.log('❌ Operation cancelled by user.');
            process.exit(0);
        }

        // プロジェクト設定を読み込み
        console.log('\n📖 Reading project configuration...');
        const { orgId, projectId } = await readProjectConfig();
        const baseEnv = {
            ...process.env,
            VERCEL_ORG_ID: orgId,
            VERCEL_PROJECT_ID: projectId,
        };

        // 環境変数をクリア
        try {
            await clearEnvironmentVariables(variablesToClear, environment, baseEnv);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (
                environment === 'staging' &&
                errorMessage.includes('Environment "staging" was not found')
            ) {
                console.log(
                    `  ⚠️  Note: Custom environment 'staging' does not exist in Vercel Dashboard.`
                );
                console.log(`     You may need to create it first:`);
                console.log(`     1. Go to Project Settings > Environment Variables`);
                console.log(`     2. Create a custom environment named 'staging'`);
                console.log(`     3. Link it to the 'staging' branch`);
            }
            throw error;
        }

        console.log(`
✅ Environment variables cleared successfully!`);
        console.log(
            `📝 Cleared ${variablesToClear.length} variables from ${environment} environment.`
        );
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
