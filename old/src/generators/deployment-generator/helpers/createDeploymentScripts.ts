/**
 * デプロイメント関連のスクリプトファイルを作成する関数
 * セットアップスクリプトと破棄スクリプトを作成
 */

import type { ProjectConfig } from '../../../commands/create/types.js';
import { createDestroyDeploymentScript } from './createDestroyDeploymentScript.js';
import { createSetupDeploymentScript } from './createSetupDeploymentScript.js';

/**
 * デプロイメント関連のスクリプトファイルを作成する関数
 * セットアップスクリプトと破棄スクリプトを作成
 * @param config プロジェクト設定
 */
export async function createDeploymentScripts(config: ProjectConfig) {
    await createSetupDeploymentScript(config);
    await createDestroyDeploymentScript(config);
}
