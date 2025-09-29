/**
 * 共有パッケージを作成するヘルパー関数
 * GraphQLTypes、SharedTypes、Configパッケージを作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * 共有パッケージの作成
 */
export async function createSharedPackages(config: MonorepoConfig) {
    // GraphQL Types package
    const graphqlTypesPath = path.join(config.projectPath, 'packages', 'graphql-types');
    const graphqlTypesPackageJson = {
        name: '@monorepo/graphql-types',
        version: '1.0.0',
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            clean: 'rm -rf dist',
        },
        devDependencies: {
            typescript: '^5.3.3',
        },
    };
    await fs.writeJSON(path.join(graphqlTypesPath, 'package.json'), graphqlTypesPackageJson, {
        spaces: 2,
    });

    // TypeScript設定
    const tsConfig = {
        compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            lib: ['ES2020'],
            declaration: true,
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
        },
        include: ['src'],
        exclude: ['node_modules', 'dist'],
    };
    await fs.writeJSON(path.join(graphqlTypesPath, 'tsconfig.json'), tsConfig, { spaces: 2 });

    // srcディレクトリとindex.ts
    await fs.ensureDir(path.join(graphqlTypesPath, 'src'));
    await fs.writeFile(
        path.join(graphqlTypesPath, 'src', 'index.ts'),
        '// 生成されたGraphQL型定義がここに置かれます\n'
    );

    // Shared Types package
    const sharedTypesPath = path.join(config.projectPath, 'packages', 'shared-types');
    const sharedTypesPackageJson = {
        name: '@monorepo/shared-types',
        version: '1.0.0',
        private: true,
        main: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
            build: 'tsc',
            clean: 'rm -rf dist',
        },
        devDependencies: {
            typescript: '^5.3.3',
        },
    };
    await fs.writeJSON(path.join(sharedTypesPath, 'package.json'), sharedTypesPackageJson, {
        spaces: 2,
    });
    await fs.writeJSON(path.join(sharedTypesPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
    await fs.ensureDir(path.join(sharedTypesPath, 'src'));
    await fs.writeFile(
        path.join(sharedTypesPath, 'src', 'index.ts'),
        '// 共有型定義がここに置かれます\n'
    );

    // Config package
    const configPath = path.join(config.projectPath, 'packages', 'config');
    const configPackageJson = {
        name: '@monorepo/config',
        version: '1.0.0',
        private: true,
        files: ['*.js', '*.json'],
    };
    await fs.writeJSON(path.join(configPath, 'package.json'), configPackageJson, { spaces: 2 });
}
