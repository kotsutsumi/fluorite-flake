import path from 'node:path';
// fsインポートは使用されていないため削除
import type { ProjectConfig } from '../commands/create/types.js';
import {
    PACKAGE_CATEGORIES,
    getPackageVersion,
    getPackageVersions,
} from '../config/package-versions/index.js';
import { writeConfigFile } from './file-generation.js';

/**
 * プロジェクト設定に基づいてpackage.jsonファイルを生成します
 * @param config プロジェクトの設定
 */
export async function generatePackageJson(config: ProjectConfig) {
    // Next.jsのみでpackage.jsonを生成 - 他のフレームワークは各々のジェネレーターで処理
    if (config.framework !== 'nextjs') {
        return;
    }

    // package.jsonの基本構造を定義
    const packageJson: {
        name: string;
        version: string;
        private: boolean;
        type: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        name: config.projectName,
        version: '0.1.0',
        private: true,
        type: 'module',
        // 標準的なNext.jsスクリプトとコード品質ツール
        scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'biome lint .',
            'lint:fix': 'biome lint --fix .',
            format: 'biome format --write .',
            'format:check': 'biome format .',
            check: 'biome check .',
            'check:fix': 'biome check --fix .',
            'env:encrypt': 'tsx scripts/env-tools.ts encrypt',
            'env:decrypt': 'tsx scripts/env-tools.ts decrypt',
            prepare: 'husky',
        },
        // プロダクション依存関係
        dependencies: getPackageVersions([
            ...PACKAGE_CATEGORIES.nextjs.dependencies,
            ...PACKAGE_CATEGORIES.ui,
            'jotai',
            'next-themes',
        ]),
        // 開発依存関係
        devDependencies: getPackageVersions([
            ...PACKAGE_CATEGORIES.nextjs.devDependencies,
            'tailwindcss',
            '@tailwindcss/postcss',
            'tailwindcss-animate',
            'husky',
            '@biomejs/biome',
            'tsx',
        ]),
    };

    // データベース依存関係を追加
    if (config.database === 'turso') {
        // Tursoデータベース用パッケージを追加
        Object.assign(
            packageJson.dependencies,
            getPackageVersions([...PACKAGE_CATEGORIES.database.turso])
        );
        // ORM設定に応じて追加パッケージをインストール
        if (config.orm === 'prisma') {
            Object.assign(
                packageJson.dependencies,
                getPackageVersions([...PACKAGE_CATEGORIES.database.prisma])
            );
            Object.assign(packageJson.devDependencies, getPackageVersions(['prisma', 'tsx']));
        } else if (config.orm === 'drizzle') {
            Object.assign(packageJson.dependencies, getPackageVersions(['drizzle-orm']));
            Object.assign(packageJson.devDependencies, getPackageVersions(['drizzle-kit', 'tsx']));
        }
    } else if (config.database === 'supabase') {
        // Supabaseデータベース用パッケージを追加
        Object.assign(
            packageJson.dependencies,
            getPackageVersions([...PACKAGE_CATEGORIES.database.supabase])
        );
        // ORM設定に応じて追加パッケージをインストール
        if (config.orm === 'prisma') {
            Object.assign(
                packageJson.dependencies,
                getPackageVersions([...PACKAGE_CATEGORIES.database.prisma])
            );
            Object.assign(packageJson.devDependencies, getPackageVersions(['prisma', 'tsx']));
        } else if (config.orm === 'drizzle') {
            Object.assign(packageJson.dependencies, getPackageVersions(['drizzle-orm']));
            Object.assign(packageJson.devDependencies, getPackageVersions(['drizzle-kit', 'tsx']));
        }
    }

    // デプロイ依存関係を追加
    if (config.deployment) {
        packageJson.dependencies['@vercel/analytics'] = getPackageVersion('@vercel/analytics');
        packageJson.dependencies['@vercel/speed-insights'] =
            getPackageVersion('@vercel/speed-insights');
    }

    // ストレージ依存関係を追加
    if (config.storage !== 'none') {
        const storageDeps =
            PACKAGE_CATEGORIES.storage[config.storage as keyof typeof PACKAGE_CATEGORIES.storage];
        if (storageDeps) {
            Object.assign(packageJson.dependencies, getPackageVersions([...storageDeps]));
        }
    }

    // 認証依存関係を追加
    if (config.auth) {
        Object.assign(packageJson.dependencies, getPackageVersions([...PACKAGE_CATEGORIES.auth]));
    }

    // 依存関係と開発依存関係をアルファベット順にソート
    packageJson.dependencies = sortObject(packageJson.dependencies);
    packageJson.devDependencies = sortObject(packageJson.devDependencies);

    // 共有ユーティリティを使用してpackage.jsonを書き込み
    await writeConfigFile(path.join(config.projectPath, 'package.json'), packageJson, {
        sortKeys: true,
    });
}

/**
 * オブジェクトのキーをアルファベット順にソートします
 * @param obj ソートするオブジェクト
 * @returns ソートされたオブジェクト
 */
function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
        .sort()
        .reduce((result: Record<string, string>, key: string) => {
            result[key] = obj[key];
            return result;
        }, {});
}
