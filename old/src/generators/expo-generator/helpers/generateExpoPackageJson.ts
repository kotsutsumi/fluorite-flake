import path from 'node:path';
import fs from 'fs-extra';

import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Expo用のpackage.jsonファイルを生成する（依存関係とスクリプトを含む）
 * Expoの最新バージョンに対応した依存関係とビルドスクリプトを設定
 * @param config プロジェクト設定
 */
export async function generateExpoPackageJson(config: ProjectConfig) {
    const packageJson: {
        name: string;
        version: string;
        main: string;
        scripts: Record<string, string>;
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        name: config.projectName,
        version: '1.0.0',
        main: 'expo-router/entry',
        scripts: {
            start: 'expo start',
            android: 'expo start --android',
            ios: 'expo start --ios',
            web: 'expo start --web',
            test: 'jest --watchAll',
            'build:android': 'eas build --platform android',
            'build:ios': 'eas build --platform ios',
            'build:all': 'eas build --platform all',
        },
        dependencies: {
            expo: '~52.0.0',
            react: '18.3.1',
            'react-native': '0.76.5',
            'expo-router': '~4.0.0',
            'expo-constants': '~17.0.0',
            'expo-linking': '~7.0.0',
            'expo-status-bar': '~2.0.0',
            'expo-splash-screen': '~0.29.0',
            'expo-system-ui': '~4.0.0',
            'react-native-safe-area-context': '4.12.0',
            'react-native-screens': '~4.1.0',
            '@react-navigation/native': '^7.0.0',
            'react-native-gesture-handler': '~2.20.0',
            'react-native-reanimated': '~3.16.0',
            jotai: '^2.10.3',
        },
        devDependencies: {
            '@babel/core': '^7.25.0',
            '@types/react': '~18.3.0',
            '@types/jest': '^29.5.0',
            jest: '^29.4.0',
            'jest-expo': '~52.0.0',
            typescript: '~5.3.0',
        },
    };

    // Expo用データベース依存関係の追加
    if (config.database === 'turso' && config.orm === 'drizzle') {
        packageJson.dependencies['drizzle-orm'] = '^0.38.3';
        packageJson.dependencies['@libsql/client'] = '^0.15.0';
        packageJson.devDependencies['drizzle-kit'] = '^0.30.2';
    } else if (config.database === 'supabase') {
        packageJson.dependencies['@supabase/supabase-js'] = '^2.48.1';
    }

    // ストレージ依存関係の追加
    if (config.storage !== 'none') {
        switch (config.storage) {
            case 'supabase-storage':
                packageJson.dependencies['@supabase/supabase-js'] = '^2.48.1';
                break;
            case 'aws-s3':
                packageJson.dependencies['@aws-sdk/client-s3'] = '^3.705.0';
                break;
            default:
                break;
        }
    }

    // 認証依存関係の追加
    if (config.auth) {
        packageJson.dependencies['expo-auth-session'] = '~6.0.0';
        packageJson.dependencies['expo-crypto'] = '~14.0.0';
        packageJson.dependencies['expo-web-browser'] = '~14.0.0';
        packageJson.dependencies['expo-secure-store'] = '~13.0.0';
    }

    await fs.writeJSON(path.join(config.projectPath, 'package.json'), packageJson, {
        spaces: 2,
    });
}
