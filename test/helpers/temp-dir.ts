/**
 * テストで利用するテンポラリディレクトリやフィクスチャ操作を管理するユーティリティ群。
 * 生成したパスを記録してクリーンアップを自動化し、プロジェクトファイルの読み書きヘルパーも提供する。
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

/**
 * 作成した一時ディレクトリを追跡し、テスト終了時に一括削除するための集合。
 */
const cleanupPaths = new Set<string>();

/**
 * テスト用の一時ディレクトリを作成し、自動クリーンアップ対象として登録する。
 */
export async function createTempDir(prefix = 'ff-test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    cleanupPaths.add(tempDir);
    return tempDir;
}

/**
 * 簡易的な `package.json` を含む一時プロジェクトを作成する。
 * フレームワーク種別に応じた初期ファイルも必要に応じて用意する。
 */
export async function createTempProject(
    projectName = 'test-project',
    options: {
        framework?: 'nextjs' | 'expo' | 'tauri' | 'flutter';
        packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
    } = {}
): Promise<string> {
    const projectPath = await createTempDir(`ff-${projectName}-`);

    // ベースとなる package.json を生成する
    const packageJson = {
        name: projectName,
        version: '0.0.0',
        private: true,
        scripts: {},
        ...(options.packageManager && {
            packageManager: options.packageManager === 'pnpm' ? 'pnpm@9.0.0' : undefined,
        }),
    };

    await fs.writeJSON(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

    // Next.js プロジェクト向けに .env 系ファイルを作成する
    if (options.framework === 'nextjs') {
        await fs.writeFile(path.join(projectPath, '.env.local'), '');
        await fs.writeFile(path.join(projectPath, '.env'), '');
    }

    // Flutter プロジェクト向けに pubspec.yaml を用意する
    if (options.framework === 'flutter') {
        await fs.writeFile(
            path.join(projectPath, 'pubspec.yaml'),
            `name: ${projectName}
description: A test Flutter project
version: 0.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'
`
        );
    }

    return projectPath;
}

/**
 * 指定された一時ディレクトリを削除し、追跡リストからも除外する。
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
    if (cleanupPaths.has(dirPath)) {
        try {
            await fs.remove(dirPath);
            cleanupPaths.delete(dirPath);
        } catch (error) {
            console.warn(`Failed to cleanup temp directory: ${dirPath}`, error);
        }
    }
}

/**
 * テスト中に作成したすべての一時ディレクトリを削除する。
 * グローバルテアダウンで呼び出す想定。
 */
export async function cleanupAllTempDirs(): Promise<void> {
    const promises = Array.from(cleanupPaths).map((dirPath) =>
        fs.remove(dirPath).catch((err) => console.warn(`Failed to cleanup ${dirPath}:`, err))
    );
    await Promise.all(promises);
    cleanupPaths.clear();
}

/**
 * プロジェクトパス以下のファイルを読み取るユーティリティ。
 */
export async function readProjectFile(projectPath: string, filePath: string): Promise<string> {
    return fs.readFile(path.join(projectPath, filePath), 'utf8');
}

/**
 * プロジェクト内の JSON ファイルを読み取ってパースする。
 */
export async function readProjectJson<T = Record<string, unknown>>(
    projectPath: string,
    filePath: string
): Promise<T> {
    return fs.readJSON(path.join(projectPath, filePath));
}

/**
 * 指定ファイルがプロジェクト内に存在するか判定する。
 */
export async function projectFileExists(projectPath: string, filePath: string): Promise<boolean> {
    return fs.pathExists(path.join(projectPath, filePath));
}

/**
 * プロジェクト配下のディレクトリに含まれるファイル一覧を取得する。
 */
export async function listProjectFiles(projectPath: string, dirPath = '.'): Promise<string[]> {
    const fullPath = path.join(projectPath, dirPath);
    try {
        const files = await fs.readdir(fullPath);
        return files;
    } catch {
        return [];
    }
}

/**
 * 指定内容でファイルを書き込み、親ディレクトリがなければ自動で作成する。
 */
export async function writeProjectFile(
    projectPath: string,
    filePath: string,
    content: string
): Promise<void> {
    const fullPath = path.join(projectPath, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
}

/**
 * テスト用フィクスチャをプロジェクトにコピーする。存在しない場合はエラーを投げる。
 */
export async function copyFixture(
    fixtureName: string,
    projectPath: string,
    targetPath = '.'
): Promise<void> {
    const fixturePath = path.join(__dirname, '../fixtures', fixtureName);
    const targetFullPath = path.join(projectPath, targetPath);

    if (await fs.pathExists(fixturePath)) {
        await fs.copy(fixturePath, targetFullPath);
    } else {
        throw new Error(`Fixture not found: ${fixtureName}`);
    }
}
