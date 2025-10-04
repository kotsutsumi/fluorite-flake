import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Tauriアプリケーションの基本ディレクトリ構造を作成する
 * @param config プロジェクト設定
 */
export async function createTauriAppStructure(config: ProjectConfig) {
    // 作成するディレクトリリスト（Tauri構造）
    const dirs = [
        'src', // Reactフロントエンドソース
        'src/components', // Reactコンポーネント
        'src/styles', // CSSスタイルファイル
        'src/utils', // ユーティリティ関数
        'src-tauri', // Rustバックエンドルート
        'src-tauri/src', // Rustソースコード
        'public', // 静的アセット
    ];

    // 各ディレクトリを作成
    for (const dir of dirs) {
        await fs.ensureDir(path.join(config.projectPath, dir));
    }
}
