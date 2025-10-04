/**
 * package.jsonにデプロイメント関連のスクリプトを追加する関数
 * 基本デプロイ、環境別デプロイ、環境変数管理コマンドを追加
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * package.jsonにデプロイメント関連のスクリプトを追加する関数
 * 基本デプロイ、環境別デプロイ、環境変数管理コマンドを追加
 * @param config プロジェクト設定
 */
export async function addDeploymentScripts(config: ProjectConfig) {
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
