/**
 * GraphQLバックエンドのセットアップを行うヘルパー関数
 * 必要な依存関係の追加とGraphQL関連ファイルの作成を行う
 */

import path from 'node:path';
import fs from 'fs-extra';

import type { MonorepoConfig } from '../types/MonorepoConfig.js';
import { createGraphQLFiles } from './createGraphQLFiles.js';

/**
 * GraphQL バックエンドのセットアップ
 */
export async function setupGraphQLBackend(config: MonorepoConfig) {
    const backendPath = config.projectPath;

    // GraphQL関連の依存関係を追加
    const graphqlDeps = {
        '@apollo/server': '^4.9.5',
        graphql: '^16.8.1',
        'graphql-scalars': '^1.22.4',
        '@graphql-tools/schema': '^10.0.2',
        'graphql-tag': '^2.12.6',
    };

    const devDeps = {
        '@graphql-codegen/cli': '^5.0.0',
        '@graphql-codegen/typescript': '^4.0.1',
        '@graphql-codegen/typescript-resolvers': '^4.0.1',
        '@graphql-codegen/typescript-operations': '^4.0.1',
    };

    // package.jsonの更新
    const packageJsonPath = path.join(backendPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.dependencies = { ...packageJson.dependencies, ...graphqlDeps };
    packageJson.devDependencies = { ...packageJson.devDependencies, ...devDeps };

    // GraphQL関連スクリプトの追加
    packageJson.scripts = {
        ...packageJson.scripts,
        codegen: 'graphql-codegen',
        'codegen:watch': 'graphql-codegen --watch',
    };

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // GraphQL設定ファイルとスキーマを作成
    await createGraphQLFiles(backendPath, config);
}
