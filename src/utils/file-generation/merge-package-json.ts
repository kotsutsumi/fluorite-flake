import path from 'node:path';
import fs from 'fs-extra';
import { writeConfigFile } from './write-config-file.js';

/**
 * package.jsonファイルをマージします
 * @param targetPath 対象プロジェクトのパス
 * @param additions 追加する設定
 * @param additions.dependencies 追加する依存関係
 * @param additions.devDependencies 追加する開発依存関係
 * @param additions.scripts 追加するスクリプト
 */
export async function mergePackageJson(
    targetPath: string,
    additions: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
        [key: string]: unknown;
    }
): Promise<void> {
    const packageJsonPath = path.join(targetPath, 'package.json');
    // 既存のpackage.jsonを読み込み（存在しない場合は空オブジェクト）
    const existingPackageJson = await fs.readJSON(packageJsonPath).catch(() => ({}));

    // 既存の設定と新しい設定をマージ
    const merged = {
        ...existingPackageJson,
        ...additions,
        dependencies: {
            ...existingPackageJson.dependencies,
            ...additions.dependencies,
        },
        devDependencies: {
            ...existingPackageJson.devDependencies,
            ...additions.devDependencies,
        },
        scripts: {
            ...existingPackageJson.scripts,
            ...additions.scripts,
        },
    };

    await writeConfigFile(packageJsonPath, merged, { sortKeys: true });
}
