// @ts-nocheck
import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../commands/create/types.js';
import { readTemplate } from '../utils/template-reader.js';

// シンプルなロガーの代替実装
const _logger = {
    info: (message: string, meta?: unknown) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message: string, meta?: unknown) => console.warn(`[WARN] ${message}`, meta || ''),
    debug: (message: string, meta?: unknown) => console.debug(`[DEBUG] ${message}`, meta || ''),
    error: (message: string, meta?: unknown) => console.error(`[ERROR] ${message}`, meta || ''),
};

/**
 * ストレージ設定を行うメイン関数
 * 指定されたストレージプロバイダーに応じて設定ファイルやAPIルートを生成
 * @param config プロジェクト設定
 */
export async function setupStorage(config: ProjectConfig) {
    if (config.storage === 'none') {
        return;
    }

    // ストレージプロバイダーごとの設定を実行
    switch (config.storage) {
        case 'vercel-blob':
            await setupVercelBlob(config);
            break;
        case 'aws-s3':
            await setupAwsS3(config);
            break;
        case 'cloudflare-r2':
            await setupCloudflareR2(config);
            break;
        case 'supabase-storage':
            await setupSupabaseStorage(config);
            break;
        default:
            break;
    }

    // 共通のAPIルートとアップロードコンポーネントを作成
    await createStorageApiRoutes(config);
    await createUploadComponent(config);
}

/**
 * Vercel Blobストレージの設定を行う関数
 * セットアップスクリプト、環境変数、ストレージライブラリを生成
 * @param config プロジェクト設定
 */
async function setupVercelBlob(config: ProjectConfig) {
    // テンプレートからセットアップスクリプトを作成
    const setupBlobScript = await readTemplate(
        'storage/vercel-blob/scripts/setup-blob.sh.template'
    );

    // セットアップスクリプトを書き込み
    const scriptsDir = path.join(config.projectPath, 'scripts');
    await fs.ensureDir(scriptsDir);
    await fs.writeFile(path.join(scriptsDir, 'setup-vercel-blob.sh'), setupBlobScript, {
        mode: 0o755,
    });

    // .env.localに最小限のプレースホルダーを追加
    await appendEnv(
        config.projectPath,
        `# Vercel Blob Storage\n# Run 'npm run setup:blob' to automatically configure the token\nBLOB_READ_WRITE_TOKEN=""\nBLOB_STORE_ID=""`,
        config.framework
    );

    // テンプレートからVercel Blob用ストレージライブラリを作成（API経由でのアクセス）
    const storageContent = await readTemplate('storage/vercel-blob/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // ローカル開発用のストレージエミュレーションライブラリを作成
    const localStorageContent = await readTemplate(
        'storage/vercel-blob/lib/storage-local.ts.template'
    );
    const localStoragePath = path.join(config.projectPath, 'src/lib/storage-local.ts');
    await fs.writeFile(localStoragePath, localStorageContent);

    // ローカルエミュレーション用の.storageディレクトリを作成
    const storageDir = path.join(config.projectPath, '.storage');
    await fs.ensureDir(storageDir);
    await fs.writeFile(path.join(storageDir, '.gitkeep'), '');

    // package.jsonにセットアップスクリプトを追加
    const packageJsonPath = path.join(config.projectPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.scripts = {
        ...packageJson.scripts,
        'setup:blob': 'bash scripts/setup-vercel-blob.sh',
        'setup:storage': 'bash scripts/setup-vercel-blob.sh',
        'check:blob': 'tsx scripts/check-blob-config.ts',
    };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // テンプレートからBlob設定チェックスクリプトを作成
    const checkBlobScript = await readTemplate(
        'storage/vercel-blob/scripts/check-blob-config.ts.template'
    );
    await fs.writeFile(
        path.join(config.projectPath, 'scripts', 'check-blob-config.ts'),
        checkBlobScript
    );

    // Vercel CLIの可用性をチェックしてガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkVercelStorageAvailability(config);
}

/**
 * AWS S3ストレージの設定を行う関数
 * 環境変数とストレージライブラリを設定
 * @param config プロジェクト設定
 */
async function setupAwsS3(config: ProjectConfig) {
    // AWS S3の環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# AWS S3\nAWS_REGION="us-east-1"\nAWS_ACCESS_KEY_ID="[your-access-key]"\nAWS_SECRET_ACCESS_KEY="[your-secret-key]"\nS3_BUCKET_NAME="[your-bucket-name]"\nAWS_S3_PUBLIC_URL="https://[your-bucket-name].s3.amazonaws.com"\n`,
        config.framework
    );

    // テンプレートからAWS S3用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/aws-s3/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // AWS CLIの可用性をチェックしてガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkAwsAvailability(config);
}

/**
 * Cloudflare R2ストレージの設定を行う関数
 * 環境変数とストレージライブラリを設定
 * @param config プロジェクト設定
 */
async function setupCloudflareR2(config: ProjectConfig) {
    // Cloudflare R2の環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# Cloudflare R2\nR2_ACCOUNT_ID="[your-account-id]"\nR2_ACCESS_KEY_ID="[your-access-key]"\nR2_SECRET_ACCESS_KEY="[your-secret-key]"\nR2_BUCKET_NAME="[your-bucket-name]"\nR2_PUBLIC_URL="https://[your-public-url]"\nR2_CUSTOM_ENDPOINT=""\n`,
        config.framework
    );

    // テンプレートからCloudflare R2用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/cloudflare-r2/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);

    // Wrangler CLIの可用性をチェックしてガイダンスを提供
    // TODO: CLIアダプターが修正されたら有効化
    // await checkWranglerAvailability(config);
}

/**
 * Supabaseストレージの設定を行う関数
 * 環境変数、Supabaseクライアント、ストレージライブラリを設定
 * @param config プロジェクト設定
 */
async function setupSupabaseStorage(config: ProjectConfig) {
    // Supabase Storageの環境変数を追加
    await appendEnv(
        config.projectPath,
        `\n# Supabase Storage\nNEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"\nSUPABASE_SERVICE_ROLE_KEY="[service-role-key]"\nSUPABASE_STORAGE_BUCKET="uploads"\n`,
        config.framework
    );

    // Supabaseクライアントが存在することを確認
    await ensureSupabaseClient(config);

    // テンプレートからSupabase用ストレージライブラリを作成
    const storageContent = await readTemplate('storage/supabase/lib/storage.ts.template');
    await writeStorageLib(config, storageContent);
}

/**
 * Supabaseクライアントの存在を確認し、必要に応じて作成する関数
 * @param config プロジェクト設定
 */
async function ensureSupabaseClient(config: ProjectConfig) {
    const supabasePath = path.join(config.projectPath, 'src/lib/supabase.ts');
    if (await fs.pathExists(supabasePath)) {
        return;
    }

    // テンプレートからSupabaseクライアントを作成
    const clientContent = await readTemplate('storage/supabase/lib/client.ts.template');
    await fs.ensureDir(path.dirname(supabasePath));
    await fs.writeFile(supabasePath, clientContent);
}

/**
 * ストレージ用のAPIルートを作成する関数
 * アップロード、汎用アクセス、デバッグ用のルートを生成
 * @param config プロジェクト設定
 */
async function createStorageApiRoutes(config: ProjectConfig) {
    // テンプレートからアップロードルートを作成
    const uploadRouteContent = await readTemplate('storage/common/api/upload-route.ts.template');
    const uploadRouteDir = path.join(config.projectPath, 'src/app/api/upload');
    await fs.ensureDir(uploadRouteDir);
    await fs.writeFile(path.join(uploadRouteDir, 'route.ts'), uploadRouteContent);

    // APIアクセス用のストレージキャッチオールルートを作成
    const catchAllContent = await readTemplate('storage/common/api/storage-catch-all.ts.template');
    const catchAllDir = path.join(config.projectPath, 'src/app/api/storage/[...path]');
    await fs.ensureDir(catchAllDir);
    await fs.writeFile(path.join(catchAllDir, 'route.ts'), catchAllContent);

    // 開発用のストレージデバッグルートを作成
    const debugContent = await readTemplate('storage/common/api/storage-debug.ts.template');
    const debugDir = path.join(config.projectPath, 'src/app/api/storage/debug');
    await fs.ensureDir(debugDir);
    await fs.writeFile(path.join(debugDir, 'route.ts'), debugContent);
}

/**
 * ファイルアップロード用のReactコンポーネントを作成する関数
 * @param config プロジェクト設定
 */
async function createUploadComponent(config: ProjectConfig) {
    // テンプレートからアップロードコンポーネントを作成
    const componentContent = await readTemplate(
        'storage/common/components/file-upload.tsx.template'
    );
    const componentPath = path.join(config.projectPath, 'src/components/file-upload.tsx');
    await fs.ensureDir(path.dirname(componentPath));
    await fs.writeFile(componentPath, componentContent);
}

/**
 * ストレージライブラリファイルを書き込む関数
 * @param config プロジェクト設定
 * @param contents ファイルの内容
 */
async function writeStorageLib(config: ProjectConfig, contents: string) {
    const storagePath = path.join(config.projectPath, 'src/lib/storage.ts');
    await fs.ensureDir(path.dirname(storagePath));
    await fs.writeFile(storagePath, contents);
}

// 環境変数ファイルのターゲットリスト
const ENV_TARGET_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.staging',
    '.env.production',
    '.env.prod',
];

/**
 * 環境変数ファイルに内容を追加する関数
 * フレームワークに応じて適切な環境ファイルに追記
 * @param projectPath プロジェクトのパス
 * @param content 追加する内容
 * @param framework フレームワークの種類
 */
async function appendEnv(projectPath: string, content: string, framework?: string) {
    // Next.jsの場合、存在するすべての環境ファイルに追記
    if (framework === 'nextjs') {
        for (const file of ENV_TARGET_FILES) {
            const envPath = path.join(projectPath, file);
            // ファイルが存在する場合のみ追記
            if (await fs.pathExists(envPath)) {
                await fs.appendFile(envPath, `\n${content}`);
            }
        }
    } else {
        // 他のフレームワークの場合、元の動作を維持 - 必要に応じて.env.localを作成
        const envPath = path.join(projectPath, '.env.local');
        await fs.appendFile(envPath, content);

        // .env.developmentが存在する場合は追記（それを使用するフレームワーク用）
        const envDevPath = path.join(projectPath, '.env.development');
        if (await fs.pathExists(envDevPath)) {
            await fs.appendFile(envDevPath, content);
        }
    }
}
