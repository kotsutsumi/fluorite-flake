/**
 * デプロイメント環境をセットアップするメイン関数
 * Vercel設定ファイル、デプロイメントスクリプト、自動化スクリプトを作成
 */

import type { ProjectConfig } from '../../commands/create/types.js';
import { setupTauriDeployment } from '../tauri-generator/helpers/setupTauriDeployment.js';
import { addDeploymentScripts } from './helpers/addDeploymentScripts.js';
import { createDeploymentScripts } from './helpers/createDeploymentScripts.js';
import { createVercelAutomationScript } from './helpers/createVercelAutomationScript.js';
import { createVercelConfig } from './helpers/createVercelConfig.js';

/**
 * デプロイメント環境をセットアップするメイン関数
 * Vercel設定ファイル、デプロイメントスクリプト、自動化スクリプトを作成
 * @param config プロジェクト設定
 */
export async function setupDeployment(config: ProjectConfig) {
    if (config.framework === 'tauri') {
        // Tauri向けにはGitHub Releasesを前提としたデプロイ構成を生成する
        await setupTauriDeployment(config);
        return;
    }

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
