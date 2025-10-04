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
        const tursoPackages = getPackageVersions([...PACKAGE_CATEGORIES.database.turso]);
        const libsqlVersion = tursoPackages['@libsql/client'];
        const adapterVersion = tursoPackages['@prisma/adapter-libsql'];

        if (libsqlVersion) {
            packageJson.dependencies['@libsql/client'] = libsqlVersion;
        }

        if (config.orm === 'prisma') {
            const prismaPackages = getPackageVersions([...PACKAGE_CATEGORIES.database.prisma]);
            const prismaClientVersion = prismaPackages['@prisma/client'];
            const prismaVersion = prismaPackages.prisma;

            if (prismaClientVersion) {
                packageJson.dependencies['@prisma/client'] = prismaClientVersion;
            }
            if (prismaVersion) {
                packageJson.devDependencies.prisma = prismaVersion;
            }
            if (adapterVersion) {
                packageJson.devDependencies['@prisma/adapter-libsql'] = adapterVersion;
            }
        } else if (config.orm === 'drizzle') {
            const drizzlePackages = getPackageVersions(['drizzle-orm', 'drizzle-kit']);
            const drizzleOrmVersion = drizzlePackages['drizzle-orm'];
            const drizzleKitVersion = drizzlePackages['drizzle-kit'];

            if (drizzleOrmVersion) {
                packageJson.dependencies['drizzle-orm'] = drizzleOrmVersion;
            }
            if (drizzleKitVersion) {
                packageJson.devDependencies['drizzle-kit'] = drizzleKitVersion;
            }
        }
    } else if (config.database === 'supabase') {
        const supabasePackages = getPackageVersions([...PACKAGE_CATEGORIES.database.supabase]);
        const supabaseVersion = supabasePackages['@supabase/supabase-js'];
        const postgresVersion = supabasePackages.postgres;

        if (supabaseVersion) {
            packageJson.dependencies['@supabase/supabase-js'] = supabaseVersion;
        }
        if (postgresVersion) {
            packageJson.dependencies.postgres = postgresVersion;
        }

        if (config.orm === 'prisma') {
            const prismaPackages = getPackageVersions([...PACKAGE_CATEGORIES.database.prisma]);
            const prismaClientVersion = prismaPackages['@prisma/client'];
            const prismaVersion = prismaPackages.prisma;

            if (prismaClientVersion) {
                packageJson.dependencies['@prisma/client'] = prismaClientVersion;
            }
            if (prismaVersion) {
                packageJson.devDependencies.prisma = prismaVersion;
            }
        } else if (config.orm === 'drizzle') {
            const drizzlePackages = getPackageVersions(['drizzle-orm', 'drizzle-kit']);
            const drizzleOrmVersion = drizzlePackages['drizzle-orm'];
            const drizzleKitVersion = drizzlePackages['drizzle-kit'];

            if (drizzleOrmVersion) {
                packageJson.dependencies['drizzle-orm'] = drizzleOrmVersion;
            }
            if (drizzleKitVersion) {
                packageJson.devDependencies['drizzle-kit'] = drizzleKitVersion;
            }
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
