// @ts-nocheck
import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate, readTemplateWithReplacements } from '../utils/template-reader.js';

/**
 * デプロイメント環境をセットアップするメイン関数
 * Vercel設定ファイル、デプロイメントスクリプト、自動化スクリプトを作成
 * @param config プロジェクト設定
 */
export async function setupDeployment(config: ProjectConfig) {
    // Flutterは独自のデプロイメント設定を持つためスキップ
    if (config.framework === 'flutter') {
        return;
    }

    // Vercel設定ファイルの作成
    await createVercelConfig(config);

    // デプロイメントスクリプトの追加
    await addDeploymentScripts(config);

    // 包括的なデプロイメントスクリプトの作成
    await createDeploymentScripts(config);

    // Vercelデプロイメント自動化スクリプトの作成
    if (config.database === 'turso' || config.database === 'supabase') {
        await createVercelAutomationScript(config);
    }

    // Vercel CLIの可用性チェックとプロジェクトリンクのオプション
    // TODO: CLIアダプターが修正されたら有効化
}

/**
 * Vercel設定ファイル（vercel.json）を作成する関数
 * ビルドコマンド、環境変数、データベース、ストレージ設定を含む
 * @param config プロジェクト設定
 */
async function createVercelConfig(config: ProjectConfig) {
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

/**
 * package.jsonにデプロイメント関連のスクリプトを追加する関数
 * 基本デプロイ、環境別デプロイ、環境変数管理コマンドを追加
 * @param config プロジェクト設定
 */
async function addDeploymentScripts(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    // デプロイメント関連スクリプトの定義
    const deployScripts: Record<string, string> = {
        // 基本デプロイメントコマンド
        deploy: 'vercel',
        'deploy:prod': 'vercel --prod',
        'deploy:staging': 'vercel --preview',
        'deploy:dev': 'vercel --preview',
        'deploy:destroy': 'tsx scripts/destroy-deployment.ts',

        // 環境セットアップ付き自動デプロイメント
        'deploy:setup': 'bash scripts/setup-deployment.sh',
        'deploy:setup:prod': 'bash scripts/setup-deployment.sh prod',
        'deploy:setup:staging': 'bash scripts/setup-deployment.sh staging',
        'deploy:setup:dev': 'bash scripts/setup-deployment.sh dev',

        // 環境変数管理
        'env:pull': 'vercel env pull',
        'env:pull:prod': 'vercel env pull --environment=production',
        'env:pull:staging': 'vercel env pull --environment=preview --git-branch=staging',
        'env:pull:dev': 'vercel env pull --environment=preview --git-branch=development',
    };

    // データベース固有のデプロイメントスクリプトを追加
    if (config.database === 'turso') {
        deployScripts['deploy:full'] =
            'bash scripts/setup-turso.sh --cloud && bash scripts/setup-deployment.sh';
    }

    // 既存のスクリプトとマージ
    packageJson.scripts = {
        ...packageJson.scripts,
        ...deployScripts,
    };

    // 更新されたpackage.jsonを書き込み
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

/**
 * ストレージサービスごとの環境変数プレースホルダーを取得する関数
 * Vercelデプロイメント時に必要な環境変数のプレースホルダーを返す
 * @param storage ストレージサービスの種類
 * @returns 環境変数名とプレースホルダーのマッピング
 */
function getStorageEnvPlaceholders(storage: ProjectConfig['storage']): Record<string, string> {
    switch (storage) {
        case 'vercel-blob':
            return {
                BLOB_READ_WRITE_TOKEN: '@blob_read_write_token',
            };
        case 'aws-s3':
            return {
                AWS_REGION: '@aws_region',
                AWS_ACCESS_KEY_ID: '@aws_access_key_id',
                AWS_SECRET_ACCESS_KEY: '@aws_secret_access_key',
                S3_BUCKET_NAME: '@s3_bucket_name',
            };
        case 'cloudflare-r2':
            return {
                R2_ACCOUNT_ID: '@r2_account_id',
                R2_ACCESS_KEY_ID: '@r2_access_key_id',
                R2_SECRET_ACCESS_KEY: '@r2_secret_access_key',
                R2_BUCKET_NAME: '@r2_bucket_name',
                R2_PUBLIC_URL: '@r2_public_url',
            };
        case 'supabase-storage':
            return {
                NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_anon_key',
                SUPABASE_SERVICE_ROLE_KEY: '@supabase_service_role_key',
                SUPABASE_STORAGE_BUCKET: '@supabase_storage_bucket',
            };
        default:
            return {};
    }
}

/**
 * デプロイメント関連のスクリプトファイルを作成する関数
 * セットアップスクリプトと破棄スクリプトを作成
 * @param config プロジェクト設定
 */
async function createDeploymentScripts(config: ProjectConfig) {
    await createSetupDeploymentScript(config);
    await createDestroyDeploymentScript(config);
}

/**
 * デプロイメントセットアップスクリプトを作成する関数
 * 環境変数設定、ストレージ設定、データベースマイグレーションを含む
 * @param config プロジェクト設定
 */
async function createSetupDeploymentScript(config: ProjectConfig) {
    // Blobストレージセットアップセクションを構築
    let blobStorageSetup = '';
    if (config.storage === 'vercel-blob') {
        blobStorageSetup = `# Setup Vercel Blob Storage automatically
if [ ! -f ".env.local" ] || ! grep -q "BLOB_READ_WRITE_TOKEN=" .env.local || [ -z "$(grep BLOB_READ_WRITE_TOKEN= .env.local | cut -d'=' -f2)" ]; then
    echo ""
    echo "🔑 Setting up Vercel Blob Storage..."
    if [ -f "scripts/setup-vercel-blob.sh" ]; then
        bash scripts/setup-vercel-blob.sh

        # After setup, read the token from .env.local
        if [ -f ".env.local" ]; then
            BLOB_TOKEN=$(grep BLOB_READ_WRITE_TOKEN .env.local | cut -d'=' -f2)
            if [ -n "$BLOB_TOKEN" ]; then
                echo "   Adding BLOB_READ_WRITE_TOKEN to Vercel environment..."
                echo "$BLOB_TOKEN" | vercel env add BLOB_READ_WRITE_TOKEN $ENV_FLAG --yes 2>/dev/null || true
            fi
        fi
    fi
fi
`;
    }

    // データベースマイグレーションセクションを構築
    let databaseMigrations = '';
    if (config.database !== 'none' && config.orm === 'prisma') {
        databaseMigrations = `
# Run database migrations for production
if [ "$ENV" == "prod" ] || [ "$ENV" == "production" ]; then
    echo "🗄️ Running database migrations..."
    ${config.packageManager} run db:migrate:prod || echo "Migration will run during build"
fi
`;
    }

    // テンプレートからデプロイメントスクリプトを作成
    const deployScriptContent = await readTemplateWithReplacements(
        'deployment/scripts/setup-deployment.sh.template',
        {
            projectName: config.projectName,
            packageManager: config.packageManager,
            blobStorageSetup,
            databaseMigrations,
        }
    );

    // スクリプトファイルを書き込み、実行権限を付与
    const scriptPath = path.join(config.projectPath, 'scripts', 'setup-deployment.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, deployScriptContent);
    await fs.chmod(scriptPath, '755');
}

/**
 * デプロイメント破棄スクリプトを作成する関数
 * Vercelプロジェクトや関連リソースを削除するためのスクリプト
 * @param config プロジェクト設定
 */
async function createDestroyDeploymentScript(config: ProjectConfig) {
    // テンプレートから破棄スクリプトを読み込み
    const content = await readTemplate('scripts/destroy-deployment.ts.template');
    const scriptPath = path.join(config.projectPath, 'scripts', 'destroy-deployment.ts');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, content);
}

/**
 * Vercelデプロイメント自動化スクリプトを作成する関数
 * データベースセットアップからデプロイまでを一気に実行するスクリプト
 * @param config プロジェクト設定
 */
async function createVercelAutomationScript(config: ProjectConfig) {
    // Tursoセットアップセクションを構築
    let tursoSetup = '';
    if (config.database === 'turso') {
        tursoSetup = `
# Step 1: Set up Turso Cloud databases
echo ""
echo "📦 Step 1: Setting up Turso Cloud databases..."
bash scripts/setup-turso.sh --cloud

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up Turso databases"
    exit 1
fi
`;
    }

    // データベースタイプを決定
    const databaseType = config.database === 'turso' ? 'Turso' : 'Supabase';

    // テンプレートから自動化スクリプトを作成
    const automationScriptContent = await readTemplateWithReplacements(
        'deployment/scripts/automated-deployment.sh.template',
        {
            projectName: config.projectName,
            databaseType,
            packageManager: config.packageManager,
            tursoSetup,
        }
    );

    // スクリプトファイルを書き込み、実行権限を付与
    const scriptPath = path.join(config.projectPath, 'scripts', 'automated-deployment.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, automationScriptContent);
    await fs.chmod(scriptPath, '755');

    // package.jsonに自動デプロイメントスクリプトを追加
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    packageJson.scripts = {
        ...packageJson.scripts,
        'deploy:auto': 'bash scripts/automated-deployment.sh',
    };

    // 更新されたpackage.jsonを書き込み
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
