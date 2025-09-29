/**
 * ファイル生成とテンプレート処理のための共有ユーティリティ
 */

import path from 'node:path';
import fs from 'fs-extra';

/**
 * 一貫したフォーマットでJSONコンフィグファイルを書き込みます
 * @param filePath 書き込み先のファイルパス
 * @param config 書き込む設定オブジェクト
 * @param options フォーマットオプション
 * @param options.spaces インデントスペース数（デフォルト: 2）
 * @param options.sortKeys キーをソートするかどうか
 */
export async function writeConfigFile<T extends Record<string, unknown>>(
    filePath: string,
    config: T,
    options?: {
        spaces?: number;
        sortKeys?: boolean;
    }
): Promise<void> {
    let configToWrite = config;

    if (options?.sortKeys) {
        configToWrite = sortObjectKeys(config) as T;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJSON(filePath, configToWrite, {
        spaces: options?.spaces ?? 2,
    });
}

/**
 * 適切なフォーマットでTypeScript/JavaScriptファイルを書き込みます
 * @param filePath 書き込み先のファイルパス
 * @param content ファイルの内容
 * @param options 書き込みオプション
 * @param options.addHeader ヘッダーコメントを追加するかどうか
 * @param options.headerComment カスタムヘッダーコメント
 */
export async function writeCodeFile(
    filePath: string,
    content: string,
    options?: {
        addHeader?: boolean;
        headerComment?: string;
    }
): Promise<void> {
    let finalContent = content;

    // ヘッダーコメントを追加する場合
    if (options?.addHeader) {
        const header =
            options.headerComment ??
            `/**\n * fluorite-flakeによって生成されました\n * ${new Date().toISOString()}\n */\n\n`;
        finalContent = header + content;
    }

    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, finalContent);
}

/**
 * 変数置換を使用してテンプレートを処理します
 * @param template 処理するテンプレート文字列
 * @param variables 置換する変数のキー・値ペア
 * @returns 処理されたテンプレート内容
 */
export function processTemplate(
    template: string,
    variables: Record<string, string | number | boolean>
): string {
    // {{key}}形式の変数を置換
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        return value !== undefined ? String(value) : match;
    });
}

/**
 * テンプレートファイルを読み込み、変数を処理します
 * @param templatePath テンプレートファイルのパス
 * @param variables 置換する変数のキー・値ペア
 * @param outputPath 出力先のファイルパス
 */
export async function processTemplateFile(
    templatePath: string,
    variables: Record<string, string | number | boolean>,
    outputPath: string
): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf-8');
    const processed = processTemplate(template, variables);
    await writeCodeFile(outputPath, processed);
}

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

/**
 * 環境変数ファイルを生成します
 * @param projectPath プロジェクトのパス
 * @param envVars 環境変数のキー・値ペア
 * @param filename 生成するファイル名（デフォルト: .env.example）
 */
export async function writeEnvFile(
    projectPath: string,
    envVars: Record<string, string>,
    filename: '.env' | '.env.local' | '.env.example' = '.env.example'
): Promise<void> {
    // 環境変数を KEY=VALUE 形式で連結
    const envContent = `${Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')}\n`;

    await fs.writeFile(path.join(projectPath, filename), envContent);
}

/**
 * .gitignoreファイルを生成します
 * @param projectPath プロジェクトのパス
 * @param patterns 無視するパターンの配列
 */
export async function writeGitIgnore(projectPath: string, patterns: string[]): Promise<void> {
    const gitignoreContent = `${patterns.join('\n')}\n`;
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignoreContent);
}

/**
 * よく使用される.gitignoreパターン
 */
export const GITIGNORE_PATTERNS = {
    node: [
        'node_modules/',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        '.npm',
        '.yarn-integrity',
    ],
    nextjs: ['.next/', 'out/', '*.tsbuildinfo', '.vercel'],
    env: ['.env', '.env.local', '.env.*.local'],
    build: ['build/', 'dist/', 'coverage/'],
    os: ['.DS_Store', 'Thumbs.db', '*.log'],
    tauri: ['src-tauri/target/', 'src-tauri/Cargo.lock'],
    flutter: [
        '*.lock',
        '.flutter-plugins',
        '.flutter-plugins-dependencies',
        '.packages',
        'build/',
        '.dart_tool/',
    ],
};

/**
 * オブジェクトのキーを再帰的にソートするヘルパー関数
 * @param obj ソートするオブジェクト
 * @returns キーがソートされたオブジェクト
 */
function sortObjectKeys<T>(obj: T): T {
    // プリミティブ値、null、配列の場合はそのまま返す
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const sorted = {} as T;
    // キーをアルファベット順にソート
    const keys = Object.keys(obj as Record<string, unknown>).sort();

    // ソートされたキーで新しいオブジェクトを構築
    for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key];
        (sorted as Record<string, unknown>)[key] = sortObjectKeys(value);
    }

    return sorted;
}
