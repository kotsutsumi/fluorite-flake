/**
 * プロジェクト構造の作成と管理のための共有ユーティリティ
 */

import path from 'node:path';
import fs from 'fs-extra';

/**
 * プロジェクト内に複数のディレクトリを作成します
 * @param basePath ベースパス
 * @param directories 作成するディレクトリの配列
 */
export async function createDirectoryStructure(
    basePath: string,
    directories: string[]
): Promise<void> {
    // 全てのディレクトリを並行で作成
    await Promise.all(directories.map((dir) => fs.ensureDir(path.join(basePath, dir))));
}

/**
 * 各フレームワークの一般的なディレクトリ構造
 */
export const DIRECTORY_STRUCTURES = {
    nextjs: [
        'src/app',
        'src/lib',
        'src/components',
        'src/components/ui',
        'src/utils',
        'public',
        'scripts',
    ],
    expo: ['app', 'components', 'constants', 'hooks', 'assets/images', 'assets/fonts'],
    tauri: [
        'src/components',
        'src/styles',
        'src/utils',
        'public',
        'src-tauri/src',
        'src-tauri/icons',
    ],
    flutter: [
        'lib',
        'lib/screens',
        'lib/widgets',
        'lib/models',
        'lib/services',
        'lib/utils',
        'test',
        'assets/images',
        'assets/fonts',
        'android',
        'ios',
        'web',
        'linux',
        'macos',
        'windows',
    ],
} as const;

/**
 * フレームワークの標準ディレクトリ構造を作成します
 * @param projectPath プロジェクトのパス
 * @param framework フレームワークの種類
 */
export async function createFrameworkDirectories(
    projectPath: string,
    framework: keyof typeof DIRECTORY_STRUCTURES
): Promise<void> {
    const directories = DIRECTORY_STRUCTURES[framework];
    // フレームワーク固有のディレクトリ構造を作成
    await createDirectoryStructure(projectPath, [...directories]);
}

/**
 * ディレクトリが存在し、かつ空でないかどうかをチェックします
 * @param dirPath チェックするディレクトリのパス
 * @returns ディレクトリが空の場合はtrue
 */
export async function isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
        const files = await fs.readdir(dirPath);
        return files.length === 0;
    } catch {
        // ディレクトリが存在しない場合は空とみなす
        return true;
    }
}

/**
 * ディレクトリが存在する場合に安全に削除します
 * @param dirPath 削除するディレクトリのパス
 */
export async function removeDirectoryIfExists(dirPath: string): Promise<void> {
    try {
        await fs.remove(dirPath);
    } catch {
        // ディレクトリが存在しない場合のエラーは無視
    }
}

/**
 * テンプレートファイルを再帰的にコピーします
 * @param sourcePath コピー元のパス
 * @param targetPath コピー先のパス
 * @param options コピーオプション
 * @param options.overwrite 上書きを許可するかどうか
 * @param options.filter コピー対象をフィルタリングする関数
 */
export async function copyTemplateFiles(
    sourcePath: string,
    targetPath: string,
    options?: {
        overwrite?: boolean;
        filter?: (src: string, dest: string) => boolean;
    }
): Promise<void> {
    await fs.copy(sourcePath, targetPath, {
        overwrite: options?.overwrite ?? false,
        filter: options?.filter,
    });
}

/**
 * 親ディレクトリを作成してファイルを作成します
 * @param filePath 作成するファイルのパス
 * @param content ファイルの内容
 */
export async function writeFileWithDirs(filePath: string, content: string): Promise<void> {
    // 親ディレクトリを確実に作成
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);
}

/**
 * プロジェクトルートからの相対パスを取得します
 * @param projectPath プロジェクトのパス
 * @param filePath ファイルのパス
 * @returns 相対パス
 */
export function getProjectRelativePath(projectPath: string, filePath: string): string {
    return path.relative(projectPath, filePath);
}

/**
 * コンテキストに応じてプロジェクト名を正規化します
 * @param name 正規化する名前
 * @param context 正規化のコンテキスト（package、directory、class）
 * @returns 正規化された名前
 */
export function normalizeProjectName(
    name: string,
    context: 'package' | 'directory' | 'class' = 'package'
): string {
    switch (context) {
        case 'package':
            // package.json用: 小文字、ハイフン区切り
            return name
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/^-+|-+$/g, '');
        case 'directory':
            // ディレクトリ用: 小文字、アンダースコア区切り
            return name
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_')
                .replace(/^_+|_+$/g, '');
        case 'class':
            // クラス名用: 英数字のみ、英字から開始
            return name.replace(/[^a-zA-Z0-9]/g, '').replace(/^[^a-zA-Z]/, 'A');
        default:
            return name;
    }
}
