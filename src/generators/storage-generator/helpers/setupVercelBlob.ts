import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';
import { readTemplate } from '../../../utils/template-reader.js';
import { appendEnv } from './appendEnv.js';
import { writeStorageLib } from './writeStorageLib.js';

/**
 * Vercel Blobストレージの設定を行う関数
 * セットアップスクリプト、環境変数、ストレージライブラリを生成
 * @param config プロジェクト設定
 */
export async function setupVercelBlob(config: ProjectConfig) {
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
