/**
 * プロジェクト作成コマンドのメインモジュール
 * CLI引数モードと対話モードの両方に対応したプロジェクト生成機能を提供
 */

import path from 'node:path';
import chalk from 'chalk'; // ターミナル出力の色付けライブラリ
import fs from 'fs-extra'; // ファイルシステム操作の拡張ライブラリ
import prompts from 'prompts'; // 対話式プロンプトライブラリ

import { isConfigComplete } from './is-config-complete.js';
import { runProjectGeneration } from './run-project-generation.js';
import type { ProjectConfig } from './types.js';

/**
 * プロジェクト作成のメイン関数
 * @param providedConfig - CLI引数から提供される部分的な設定オブジェクト
 * @returns Promise<void> - 非同期処理の完了を示す
 */
export async function createProject(providedConfig?: Partial<ProjectConfig>) {
    // CLI引数モード: 必要な設定がすべて提供されている場合
    if (providedConfig && isConfigComplete(providedConfig)) {
        const config = { ...providedConfig } as ProjectConfig;

        // プロジェクトパスが指定されていない場合は現在のディレクトリにプロジェクト名のフォルダを作成
        if (!config.projectPath) {
            config.projectPath = path.join(process.cwd(), config.projectName);
        }

        // デバッグログは削除（よりクリーンな出力のため）

        // ターゲットディレクトリが既に存在する場合はエラー
        if (await fs.pathExists(config.projectPath)) {
            throw new Error(`Directory ${config.projectPath} already exists`);
        }

        // プロジェクト生成処理を実行
        await runProjectGeneration(config);
        return;
    }

    // 対話モード: ウェルカムメッセージを表示
    console.log(chalk.bold.magenta('\n✨ Multi-Framework Project Generator ✨\n'));

    // 対話式プロンプトで設定を収集
    const answers = await prompts([
        {
            // フレームワーク選択プロンプト
            type: 'select',
            name: 'framework',
            message: 'Select framework:',
            choices: [
                { title: 'Next.js (React web framework)', value: 'nextjs' },
                { title: 'Expo (React Native for mobile)', value: 'expo' },
                { title: 'Tauri (Rust + web frontend desktop)', value: 'tauri' },
                { title: 'Flutter (Cross-platform mobile/desktop)', value: 'flutter' },
            ],
            initial: 0,
        },
        {
            // Monorepo option for mobile/desktop frameworks
            type: (_prev, values) =>
                ['expo', 'flutter', 'tauri'].includes(values.framework) ? 'confirm' : null,
            name: 'isMonorepo',
            message: 'Create a monorepo with backend (Next.js) and frontend?',
            initial: true,
        },
        {
            // Workspace tool selection for monorepo
            type: (_prev, values) => (values.isMonorepo ? 'select' : null),
            name: 'workspaceTool',
            message: 'Select monorepo tool:',
            choices: [
                { title: 'Turborepo (Recommended)', value: 'turborepo' },
                { title: 'Nx', value: 'nx' },
                { title: 'PNPM Workspaces', value: 'pnpm-workspace' },
            ],
            initial: 0,
        },
        {
            type: 'text',
            name: 'projectName',
            message: 'Project name:',
            // フレームワークに応じたデフォルトのプロジェクト名を設定
            initial: (prev: string) => {
                switch (prev) {
                    case 'nextjs':
                        return 'my-next-app';
                    case 'expo':
                        return 'my-expo-app';
                    case 'tauri':
                        return 'my-tauri-app';
                    case 'flutter':
                        return 'my-flutter-app';
                    default:
                        return 'my-app';
                }
            },
            // プロジェクト名のバリデーション
            validate: (value: string) => {
                // 空文字チェック
                if (!value || value.trim() === '') {
                    return 'Project name is required';
                }
                // 使用可能文字のチェック（小文字、数字、ハイフン、アンダースコアのみ）
                if (!/^[a-z0-9-_]+$/.test(value)) {
                    return 'Project name can only contain lowercase letters, numbers, hyphens, and underscores';
                }
                return true;
            },
        },
        {
            // データベース選択（Next.jsまたはMonorepoモード）
            type: (_prev, values) =>
                values.framework === 'nextjs' || values.isMonorepo ? 'select' : null,
            name: 'database',
            message: (_prev, values) =>
                values.isMonorepo ? 'Select database for backend:' : 'Select database:',
            choices: [
                { title: 'None', value: 'none' },
                { title: 'Turso (SQLite edge database)', value: 'turso' },
                { title: 'Supabase (PostgreSQL)', value: 'supabase' },
            ],
            initial: 0,
        },
        {
            // ORM選択（データベースが選択されている場合のみ表示）
            type: (_prev, values) =>
                values.database && values.database !== 'none' ? 'select' : null,
            name: 'orm',
            message: 'Select ORM:',
            choices: [
                { title: 'Prisma', value: 'prisma' },
                { title: 'Drizzle', value: 'drizzle' },
            ],
            initial: 0,
        },
        {
            // デプロイメント設定（フレームワーク固有）
            type: (_prev, values) => {
                switch (values.framework) {
                    case 'nextjs':
                        return 'confirm';
                    case 'tauri':
                        return 'confirm';
                    case 'flutter':
                        return 'confirm';
                    default:
                        return null;
                }
            },
            name: 'deployment',
            // フレームワークに応じたデプロイメント方法のメッセージ
            message: (_prev, values) => {
                switch (values.framework) {
                    case 'nextjs':
                        return 'Setup Vercel deployment?'; // Vercelへのデプロイ設定
                    case 'tauri':
                        return 'Setup GitHub Releases for desktop distribution?'; // デスクトップアプリの配布設定
                    case 'flutter':
                        return 'Setup store distribution (Play Store/App Store)?'; // モバイルストア配布設定
                    default:
                        return 'Setup deployment?';
                }
            },
            initial: false,
        },
        {
            // ストレージプロバイダー選択（Next.jsまたはMonorepoモード）
            type: (_prev, values) =>
                values.framework === 'nextjs' || values.isMonorepo ? 'select' : null,
            name: 'storage',
            message: (_prev, values) =>
                values.isMonorepo
                    ? 'Select storage provider for backend:'
                    : 'Select storage provider:',
            choices: [
                { title: 'None', value: 'none' },
                { title: 'Vercel Blob', value: 'vercel-blob' },
                { title: 'Cloudflare R2', value: 'cloudflare-r2' },
                { title: 'AWS S3', value: 'aws-s3' },
                { title: 'Supabase Storage', value: 'supabase-storage' },
            ],
            initial: 0,
        },
        {
            // 認証設定（Next.js + Prisma または Monorepo）
            type: (_prev, values) =>
                (values.framework === 'nextjs' &&
                    values.database !== 'none' &&
                    values.orm === 'prisma') ||
                (values.isMonorepo && values.database !== 'none' && values.orm === 'prisma')
                    ? 'confirm'
                    : null,
            name: 'auth',
            // フレームワーク固有の認証ライブラリメッセージ
            message: (_prev, values) => {
                if (values.isMonorepo) {
                    return 'Add authentication with admin panel (Better Auth + GraphQL)?';
                }
                switch (values.framework) {
                    case 'nextjs':
                        return 'Add authentication (Better Auth)?'; // Better Authライブラリを使用
                    case 'expo':
                        return 'Add authentication (Expo Auth Session)?'; // Expo Auth Sessionを使用
                    default:
                        return 'Add authentication?';
                }
            },
            initial: (_prev, values) => !!values.isMonorepo, // Monorepo mode defaults to true
        },
        {
            // Storybook設定（Next.jsのみ）
            type: (_prev, values) => (values.framework === 'nextjs' ? 'confirm' : null),
            name: 'storybook',
            message: 'Setup Storybook for component development and testing?', // コンポーネント開発環境の設定
            initial: false,
        },
        {
            // パッケージマネージャー選択（Flutter以外）
            type: (_prev, values) => (values.framework !== 'flutter' ? 'select' : null),
            name: 'packageManager',
            message: 'Select package manager:', // Node.jsパッケージマネージャーの選択
            choices: [
                { title: 'pnpm', value: 'pnpm' },
                { title: 'npm', value: 'npm' },
                { title: 'yarn', value: 'yarn' },
                { title: 'bun', value: 'bun' },
            ],
            initial: 0,
        },
    ]);

    // ユーザーがキャンセルした場合の処理
    if (!answers.projectName) {
        console.log(chalk.yellow('\n✖ Project creation cancelled'));
        process.exit(0);
    }

    // 収集した回答から完全な設定オブジェクトを構築
    const config: ProjectConfig = {
        ...answers,
        database: answers.database ?? 'none', // デフォルト: データベースなし
        storage: (answers.storage ?? 'none') as ProjectConfig['storage'], // デフォルト: ストレージなし
        auth: answers.auth ?? false, // デフォルト: 認証なし
        storybook: answers.storybook ?? false, // デフォルト: Storybookなし
        deployment: answers.deployment ?? false, // デフォルト: デプロイメント設定なし
        packageManager: answers.packageManager ?? 'pnpm', // デフォルト: pnpm
        projectPath: path.join(process.cwd(), answers.projectName), // プロジェクトのフルパス
        mode: 'full', // 生成モード（full: 完全版）
    };

    // Monorepo specific configuration
    if (config.isMonorepo) {
        config.frontendFramework = config.framework as 'expo' | 'flutter' | 'tauri';
        config.includeBackend = true;

        // Create backend configuration
        config.backendConfig = {
            projectName: `${config.projectName}-backend`,
            projectPath: '', // Will be set by monorepo generator
            framework: 'nextjs',
            database: config.database,
            orm: config.orm,
            deployment: config.deployment,
            storage: config.storage,
            auth: config.auth,
            packageManager: config.packageManager,
            mode: config.mode,
        };
    }

    // ターゲットディレクトリが既に存在する場合はエラー終了
    if (await fs.pathExists(config.projectPath)) {
        console.log(chalk.red(`\n✖ Directory ${config.projectName} already exists`));
        process.exit(1);
    }

    // プロジェクト生成処理の実行（エラーハンドリング付き）
    try {
        await runProjectGeneration(config);
    } catch (error) {
        // エラーが発生した場合は赤色でエラーメッセージを表示して終了
        console.error(chalk.red('\n✖ Error creating project:'), error);
        process.exit(1);
    }
}
