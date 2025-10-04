import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Expoアプリケーションの基本ディレクトリ構造を作成する
 * Expo Routerの規約に従ったディレクトリ構造を構築し、開発に必要な基本フォルダを準備する
 * @param config プロジェクト設定
 */
export async function createExpoAppStructure(config: ProjectConfig) {
    // 作成するディレクトリリスト（Expo Router構造）
    const dirs = [
        'app', // Expo Routerのページとレイアウト
        'components', // 再利用可能なコンポーネント
        'components/ui', // UIライブラリコンポーネント
        'constants', // 定数定義ファイル
        'hooks', // カスタムReactフック
        'assets', // 静的アセット
        'assets/images', // 画像ファイル
        'assets/fonts', // フォントファイル
    ];

    // 各ディレクトリを作成
    for (const dir of dirs) {
        await fs.ensureDir(path.join(config.projectPath, dir));
    }
}
