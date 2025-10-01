/**
 * GraphQL関連ファイルを作成するヘルパー関数
 * スキーマ、リゾルバー、APIルート、Codegen設定を作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import { readTemplate } from '../../../utils/template-reader.js';
import type { MonorepoConfig } from '../types/MonorepoConfig.js';

/**
 * GraphQL関連ファイルの作成
 */
export async function createGraphQLFiles(backendPath: string, _config: MonorepoConfig) {
    // GraphQL スキーマディレクトリ（srcディレクトリ含む）
    const graphqlDir = path.join(backendPath, 'src', 'lib', 'graphql');
    await fs.ensureDir(graphqlDir);

    // GraphQL スキーマファイル
    const schemaContent = await readTemplate('graphql/schema.graphql.template');
    await fs.writeFile(path.join(graphqlDir, 'schema.graphql'), schemaContent);

    // リゾルバーファイル
    const resolversContent = await readTemplate('graphql/resolvers.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'resolvers.ts'), resolversContent);

    // GraphQL APIルート（srcディレクトリ含む）
    const apiDir = path.join(backendPath, 'src', 'app', 'api', 'graphql');
    await fs.ensureDir(apiDir);

    const routeContent = await readTemplate('graphql/route.ts.template');
    await fs.writeFile(path.join(apiDir, 'route.ts'), routeContent);

    // GraphQL Codegen設定
    const codegenConfig = await readTemplate('graphql/codegen.yml.template');
    await fs.writeFile(path.join(backendPath, 'codegen.yml'), codegenConfig);
}
