/**
 * 完全なUIライブラリとコンポーネントをセットアップするヘルパー関数
 * 実用的なUIコンポーネントライブラリを生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { createScopedLogger } from '../../../utils/logger.js';

const logger = createScopedLogger('next');

/**
 * 完全なUIライブラリとコンポーネントをセットアップする
 * @param config プロジェクト設定
 */
export async function setupUILibraries(config: ProjectConfig): Promise<void> {
    // utils.tsファイルの作成
    const utilsContent = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

    await fs.writeFile(path.join(config.projectPath, 'src/lib/utils.ts'), utilsContent);

    logger.step('UIコンポーネントライブラリをインストール中...');

    // テンプレートから事前検証済みUIコンポーネントをコピー
    const templatesPath = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        '../../../templates/nextjs-ui-components'
    );
    const targetPath = path.join(config.projectPath, 'src/components/ui');

    await fs.ensureDir(targetPath);
    await fs.copy(templatesPath, targetPath, { overwrite: true });

    logger.success('検証済みUIコンポーネントをインストール完了');
}
