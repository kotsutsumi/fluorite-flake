/**
 * フレームワーク設定定義
 * 各フレームワークの詳細設定とサポート機能を定義
 */

import type { FrameworkConfig, FrameworkType } from './types.js';

/**
 * フレームワーク設定マップ
 * サポートされている全フレームワークの設定情報
 */
export const FRAMEWORK_CONFIGS: Record<FrameworkType, FrameworkConfig> = {
    // Next.js 設定 - プロダクション対応のReactフレームワーク
    nextjs: {
        name: 'nextjs',
        displayName: 'Next.js',
        defaultName: 'my-next-app',
        description: 'プロダクション対応のWebアプリケーション用Reactフレームワーク',
        supportedFeatures: {
            database: true,
            auth: true,
            storage: true,
            deployment: true,
            packageManager: true,
        },
        supportedDatabases: ['none', 'turso', 'supabase'], // 対応データベース
        supportedOrms: ['prisma', 'drizzle'], // 対応ORM
        supportedStorage: ['none', 'vercel-blob', 'cloudflare-r2', 'aws-s3', 'supabase-storage'], // 対応ストレージ
        versions: {
            // パッケージバージョン定義
            next: '15.5.4', // Next.jsコア
            react: '19.0.0', // Reactライブラリ
            'react-dom': '19.0.0', // React DOMレンダリング
            typescript: '^5.6.0', // TypeScript
            tailwindcss: '^4', // Tailwind CSS
            '@types/node': '^22.0.0', // Node.js型定義
            '@types/react': '^19.0.0', // React型定義
            '@types/react-dom': '^19.0.0', // React DOM型定義
        },
        requiredDependencies: ['next', 'react', 'react-dom'], // 必須依存関係
        devDependencies: ['typescript', '@types/node', '@types/react', '@types/react-dom'], // 開発依存関係
    },
    // Expo 設定 - モバイルアプリケーション用React Nativeフレームワーク
    expo: {
        name: 'expo',
        displayName: 'Expo',
        defaultName: 'my-expo-app',
        description: 'モバイルアプリケーション用React Nativeフレームワーク',
        supportedFeatures: {
            database: true,
            auth: true,
            storage: true,
            deployment: false,
            packageManager: true,
        },
        supportedDatabases: ['none', 'turso', 'supabase'], // 対応データベース
        supportedOrms: ['prisma', 'drizzle'], // 対応ORM
        supportedStorage: ['none', 'cloudflare-r2', 'aws-s3', 'supabase-storage'], // 対応ストレージ
        versions: {
            expo: '~52.0.0',
            react: '18.3.1',
            'react-native': '0.76.5',
            typescript: '^5.3.0',
            '@types/react': '~18.3.0',
            '@expo/vector-icons': '^14.0.0',
            'expo-router': '~4.0.0',
        },
        requiredDependencies: [
            'expo',
            'react',
            'react-native',
            'expo-router',
            '@expo/vector-icons',
        ],
        devDependencies: ['typescript', '@types/react'],
    },
    tauri: {
        name: 'tauri',
        displayName: 'Tauri',
        defaultName: 'my-tauri-app',
        description: 'RustバックエンドとWebフロントエンドによるデスクトップアプリケーション',
        supportedFeatures: {
            database: false,
            auth: false,
            storage: false,
            deployment: true,
            packageManager: true,
        },
        supportedDatabases: ['none'],
        supportedOrms: [],
        supportedStorage: ['none'],
        versions: {
            '@tauri-apps/api': '^2.1.1',
            '@tauri-apps/plugin-shell': '^2.0.1',
            vite: '^6.0.0',
            react: '^18.3.0',
            'react-dom': '^18.3.0',
            typescript: '^5.6.0',
            '@types/react': '^18.3.0',
            '@types/react-dom': '^18.3.0',
            '@vitejs/plugin-react': '^4.3.0',
        },
        requiredDependencies: ['@tauri-apps/api', '@tauri-apps/plugin-shell', 'react', 'react-dom'],
        devDependencies: [
            'vite',
            '@vitejs/plugin-react',
            'typescript',
            '@types/react',
            '@types/react-dom',
        ],
    },
    flutter: {
        name: 'flutter',
        displayName: 'Flutter',
        defaultName: 'my_flutter_app',
        description: 'Dartによるクロスプラットフォームアプリ',
        supportedFeatures: {
            database: false,
            auth: false,
            storage: false,
            deployment: true,
            packageManager: false,
        },
        supportedDatabases: ['none'],
        supportedOrms: [],
        supportedStorage: ['none'],
        versions: {
            flutter: '>=3.24.0',
            dart: '>=3.5.0 <4.0.0',
        },
        requiredDependencies: [],
        devDependencies: [],
    },
};
