/**
 * デプロイメントセットアップスクリプトを作成する関数
 * 環境変数設定、ストレージ設定、データベースマイグレーションを含む
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplateWithReplacements } from '../../../utils/template-reader.js';

/**
 * デプロイメントセットアップスクリプトを作成する関数
 * 環境変数設定、ストレージ設定、データベースマイグレーションを含む
 * @param config プロジェクト設定
 */
export async function createSetupDeploymentScript(config: ProjectConfig) {
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
