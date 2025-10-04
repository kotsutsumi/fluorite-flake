/**
 * Huskyを使用したGitフックを設定するヘルパー関数
 * プリコミットフックでコード品質を担保する
 */

import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';
import { createScopedLogger } from '../../../utils/logger.js';

const logger = createScopedLogger('next');

/**
 * Huskyを使用したGitフックを設定する
 * @param config プロジェクト設定
 */
export async function setupHusky(config: ProjectConfig): Promise<void> {
    const isTestMode = process.env.FLUORITE_TEST_MODE === 'true';

    // Huskyの初期化（prepareスクリプトは既にpackage.jsonに追加済み）
    if (!isTestMode) {
        try {
            await execa(config.packageManager, ['run', 'prepare'], {
                cwd: config.projectPath,
                stdio: 'inherit',
            });
        } catch (_error) {
            // Huskyの初期化に失敗してもクリティカルではない - セットアップを続行
            logger.info('注意: Huskyの初期化は次回のインストール時に完了します');
        }
    } else {
        logger.info('テストモードのためHusky prepareステップをスキップ');
    }

    // .huskyディレクトリの作成
    const huskyDir = path.join(config.projectPath, '.husky');
    await fs.ensureDir(huskyDir);

    // プリコミットフック
    const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run format check
echo "📝 Checking formatting..."
${config.packageManager} run format

# Run lint
echo "🔎 Running linter..."
${config.packageManager} run lint

# Run build
echo "🔨 Building project..."
${config.packageManager} run build

echo "✅ Pre-commit checks completed!"
`;

    const preCommitPath = path.join(huskyDir, 'pre-commit');
    await fs.writeFile(preCommitPath, preCommitContent);
    await fs.chmod(preCommitPath, '755');
}
