import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Storybookスクリプトと依存関係セットアップ
 * package.jsonにスクリプトとdevDependenciesを追加
 */

/**
 * Storybook関連のスクリプトと依存関係をセットアップする関数
 * package.jsonにスクリプトとdevDependenciesを追加
 * @param config プロジェクト設定
 */
export async function setupStorybookScripts(config: ProjectConfig) {
    const packageJsonPath = path.join(config.projectPath, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        // Storybookスクリプトを追加
        packageJson.scripts = {
            ...packageJson.scripts,
            storybook: 'storybook dev -p 6006', // 開発サーバー起動
            'build-storybook': 'storybook build', // プロダクションビルド
            'test:storybook': 'test-storybook', // ストーリーテスト実行
            'test:storybook:ci': // CI環境用テスト
                'concurrently -k -s first -n "SB,TEST" -c "magenta,blue" "pnpm build-storybook --quiet" "wait-on tcp:6006 && test-storybook"',
        };

        // Storybook依存関係をdevDependenciesに追加
        packageJson.devDependencies = {
            ...packageJson.devDependencies,
            '@storybook/addon-a11y': '^8.4.6', // アクセシビリティアドオン
            '@storybook/addon-coverage': '^1.0.4', // コードカバレッジアドオン
            '@storybook/addon-docs': '^8.4.6', // ドキュメント生成アドオン
            '@storybook/addon-essentials': '^8.4.6', // 基本アドオン集
            '@storybook/addon-interactions': '^8.4.6', // インタラクションテスト
            '@storybook/addon-styling-webpack': '^1.0.0', // CSSスタイリング
            '@storybook/addon-themes': '^8.4.6', // テーマ切り替え
            '@storybook/addon-viewport': '^8.4.6', // ビューポート設定
            '@storybook/blocks': '^8.4.6', // ドキュメントブロック
            '@storybook/nextjs': '^8.4.6', // Next.jsフレームワーク
            '@storybook/react': '^8.4.6', // Reactサポート
            '@storybook/test': '^8.4.6', // テストユーティリティ
            '@storybook/test-runner': '^0.19.1', // テストランナー
            concurrently: '^9.1.0', // 並行コマンド実行
            'wait-on': '^8.0.1', // サービス待機ユーティリティ
            storybook: '^8.4.6', // Storybookコア
        };

        // 更新されたpackage.jsonを書き込み
        await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    }
}
