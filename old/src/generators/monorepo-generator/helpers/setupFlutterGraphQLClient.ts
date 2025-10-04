/**
 * Flutter用GraphQLクライアントのセットアップを行うヘルパー関数
 * pubspec.yamlの更新とGraphQLクライアント設定ファイルの作成を行う
 */

import path from 'node:path';
import fs from 'fs-extra';

import { readTemplate } from '../../../utils/template-reader.js';

/**
 * Flutter用GraphQLクライアントのセットアップ
 */
export async function setupFlutterGraphQLClient(frontendPath: string) {
    // pubspec.yamlの更新
    const pubspecPath = path.join(frontendPath, 'pubspec.yaml');
    const pubspecContent = await fs.readFile(pubspecPath, 'utf-8');

    // GraphQL関連の依存関係を追加
    const updatedPubspec = pubspecContent.replace(
        'dependencies:',
        `dependencies:
  graphql_flutter: ^5.1.2
  flutter_secure_storage: ^9.0.0`
    );

    await fs.writeFile(pubspecPath, updatedPubspec);

    // GraphQLクライアント設定ファイルを作成
    const graphqlDir = path.join(frontendPath, 'lib', 'graphql');
    await fs.ensureDir(graphqlDir);

    const clientContent = await readTemplate('flutter/graphql_client.dart.template');
    await fs.writeFile(path.join(graphqlDir, 'graphql_client.dart'), clientContent);

    // 認証関連のクエリ/ミューテーション
    const authQueriesContent = await readTemplate('flutter/auth_queries.dart.template');
    await fs.writeFile(path.join(graphqlDir, 'auth_queries.dart'), authQueriesContent);
}
