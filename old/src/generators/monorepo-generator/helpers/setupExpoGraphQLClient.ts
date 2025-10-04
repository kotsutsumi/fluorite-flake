/**
 * Expo用GraphQLクライアントのセットアップを行うヘルパー関数
 * Apollo Clientの設定と認証関連のクエリ/ミューテーションを作成する
 */

import path from 'node:path';
import fs from 'fs-extra';

import { readTemplate } from '../../../utils/template-reader.js';

/**
 * Expo用GraphQLクライアントのセットアップ
 */
export async function setupExpoGraphQLClient(frontendPath: string) {
    // Apollo Client関連の依存関係を追加
    const apolloDeps = {
        '@apollo/client': '^3.8.8',
        graphql: '^16.8.1',
    };

    const packageJsonPath = path.join(frontendPath, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);
    packageJson.dependencies = { ...packageJson.dependencies, ...apolloDeps };
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });

    // GraphQLクライアント設定ファイルを作成
    const graphqlDir = path.join(frontendPath, 'src', 'graphql');
    await fs.ensureDir(graphqlDir);

    const clientContent = await readTemplate('expo/graphql-client.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'client.ts'), clientContent);

    // 認証関連のクエリ/ミューテーション
    const authQueriesContent = await readTemplate('expo/auth-queries.ts.template');
    await fs.writeFile(path.join(graphqlDir, 'auth-queries.ts'), authQueriesContent);
}
