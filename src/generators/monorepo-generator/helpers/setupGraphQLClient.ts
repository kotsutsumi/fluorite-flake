/**
 * GraphQLクライアントのセットアップを行うヘルパー関数
 * フレームワークに応じて適切なGraphQLクライアントを設定する
 */

import type { MonorepoConfig } from '../types/MonorepoConfig.js';
import { setupExpoGraphQLClient } from './setupExpoGraphQLClient.js';
import { setupFlutterGraphQLClient } from './setupFlutterGraphQLClient.js';
import { setupTauriGraphQLClient } from './setupTauriGraphQLClient.js';

/**
 * GraphQLクライアントのセットアップ
 */
export async function setupGraphQLClient(
    config: MonorepoConfig,
    framework: 'expo' | 'flutter' | 'tauri'
) {
    const frontendPath = config.projectPath;

    switch (framework) {
        case 'expo':
            await setupExpoGraphQLClient(frontendPath);
            break;
        case 'flutter':
            await setupFlutterGraphQLClient(frontendPath);
            break;
        case 'tauri':
            await setupTauriGraphQLClient(frontendPath);
            break;
    }
}
