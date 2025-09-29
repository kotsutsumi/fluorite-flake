/**
 * Next.jsアプリケーションの基本ディレクトリ構造を作成するヘルパー関数
 * App Routerに対応したディレクトリ構造を生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Next.jsアプリケーションの基本ディレクトリ構造を作成する
 * @param config プロジェクト設定
 */
export async function createNextAppStructure(config: ProjectConfig): Promise<void> {
    // 作成するディレクトリリスト（App Router構造）
    const dirs = [
        'src/app', // App Routerのページとレイアウト
        'src/components', // 再利用可能なコンポーネント
        'src/components/ui', // UIライブラリコンポーネント
        'src/lib', // ライブラリとユーティリティ
        'src/hooks', // カスタムReactフック
        'src/styles', // スタイルファイル
        'public', // 静的アセット
    ];

    // 各ディレクトリを作成
    for (const dir of dirs) {
        await fs.ensureDir(path.join(config.projectPath, dir));
    }
}
