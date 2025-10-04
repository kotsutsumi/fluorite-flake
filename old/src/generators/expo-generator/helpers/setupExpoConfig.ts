import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Expo設定ファイル（app.json）を作成する
 * アプリのメタデータ、プラットフォーム固有の設定、プラグイン設定を定義
 * @param config プロジェクト設定
 */
export async function setupExpoConfig(config: ProjectConfig) {
    const appConfig = {
        expo: {
            name: config.projectName,
            slug: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            version: '1.0.0',
            orientation: 'portrait',
            icon: './assets/images/icon.png',
            scheme: config.projectName.toLowerCase(),
            userInterfaceStyle: 'automatic',
            newArchEnabled: true,
            splash: {
                image: './assets/images/splash-icon.png',
                resizeMode: 'contain',
                backgroundColor: '#ffffff',
            },
            ios: {
                supportsTablet: true,
                bundleIdentifier: `com.${config.projectName.toLowerCase()}.app`,
            },
            android: {
                adaptiveIcon: {
                    foregroundImage: './assets/images/adaptive-icon.png',
                    backgroundColor: '#ffffff',
                },
                package: `com.${config.projectName.toLowerCase()}.app`,
            },
            web: {
                bundler: 'metro',
                output: 'static',
                favicon: './assets/images/favicon.png',
            },
            plugins: [
                'expo-router',
                [
                    'expo-splash-screen',
                    {
                        imageHeight: 200,
                        resizeMode: 'contain',
                        backgroundColor: '#ffffff',
                    },
                ],
            ],
            experiments: {
                typedRoutes: true,
            },
        },
    };

    await fs.writeJSON(path.join(config.projectPath, 'app.json'), appConfig, {
        spaces: 2,
    });
}
