/**
 * カスタムReactフックをセットアップするヘルパー関数
 * プロジェクトで使用するカスタムフックを生成・設定する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * カスタムReactフックをセットアップする
 * @param config プロジェクト設定
 */
export async function setupHooks(config: ProjectConfig): Promise<void> {
    // テンプレートから事前検証済みフックをコピー
    const hooksTemplatePath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        '../../../templates/nextjs-hooks'
    );
    const targetHooksPath = path.join(config.projectPath, 'src/hooks');
    await fs.ensureDir(targetHooksPath);

    // フックテンプレートの存在とファイルの確認
    if (await fs.pathExists(hooksTemplatePath)) {
        await fs.copy(hooksTemplatePath, targetHooksPath, { overwrite: true });
    }
}
