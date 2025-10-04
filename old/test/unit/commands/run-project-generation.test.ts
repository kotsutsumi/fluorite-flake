/**
 * プロジェクト生成本体 (src/commands/create/run-project-generation.ts) のユニットテスト
 * Monorepoフロー、標準フロー、テストモード、Vercel Blob、Prisma DBコマンドなどを網羅
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import ora from 'ora';
import chalk from 'chalk';

// モック設定
const mockOraInstance = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
};

vi.mock('ora', () => ({
    default: vi.fn(() => mockOraInstance),
}));

vi.mock('execa', () => ({
    execa: vi.fn(),
}));

vi.mock('fs-extra', () => ({
    default: {
        writeFile: vi.fn(),
        remove: vi.fn(),
        pathExists: vi.fn(),
    },
}));

vi.mock('../../../src/generators/auth-generator/setupAuth.js', () => ({
    setupAuth: vi.fn(),
}));

vi.mock('../../../src/generators/database-generator/setupDatabase.js', () => ({
    setupDatabase: vi.fn(),
}));

vi.mock('../../../src/generators/deployment-generator/setupDeployment.js', () => ({
    setupDeployment: vi.fn(),
}));

vi.mock('../../../src/generators/monorepo-generator/index.js', () => ({
    generateMonorepoProject: vi.fn(),
}));

vi.mock('../../../src/generators/storage-generator/setupStorage.js', () => ({
    setupStorage: vi.fn(),
}));

vi.mock('../../../src/generators/storybook-generator/setupStorybook.js', () => ({
    setupStorybook: vi.fn(),
}));

vi.mock('../../../src/utils/cloud/index.js', () => ({
    isProvisioningEligible: vi.fn(),
    provisionCloudResources: vi.fn(),
}));

vi.mock('../../../src/commands/create/generate-framework-project.js', () => ({
    generateFrameworkProject: vi.fn(),
}));

vi.mock('../../../src/commands/create/get-auth-text.js', () => ({
    getAuthText: vi.fn().mockReturnValue('Better Auth'),
}));

vi.mock('../../../src/commands/create/get-deployment-text.js', () => ({
    getDeploymentText: vi.fn().mockReturnValue('Vercel'),
}));

describe('プロジェクト生成本体 - run-project-generation.ts', () => {
    let consoleLogSpy: MockInstance;
    let consoleErrorSpy: MockInstance;
    let generateMonorepoProjectSpy: MockInstance;
    let generateFrameworkProjectSpy: MockInstance;
    let setupDatabaseSpy: MockInstance;
    let setupStorageSpy: MockInstance;
    let setupDeploymentSpy: MockInstance;
    let setupAuthSpy: MockInstance;
    let setupStorybookSpy: MockInstance;
    let isProvisioningEligibleSpy: MockInstance;
    let provisionCloudResourcesSpy: MockInstance;
    let execaSpy: MockInstance;
    let oraSpy: MockInstance;
    let _fsWriteFileSpy: MockInstance;
    let _fsRemoveSpy: MockInstance;

    beforeEach(async () => {
        // コンソール出力のモック
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            /* no-op */
        });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            /* no-op */
        });

        // ジェネレーターのモック
        const { generateMonorepoProject } = await import(
            '../../../src/generators/monorepo-generator/index.js'
        );
        const { generateFrameworkProject } = await import(
            '../../../src/commands/create/generate-framework-project.js'
        );
        const { setupDatabase } = await import(
            '../../../src/generators/database-generator/setupDatabase.js'
        );
        const { setupStorage } = await import(
            '../../../src/generators/storage-generator/setupStorage.js'
        );
        const { setupDeployment } = await import(
            '../../../src/generators/deployment-generator/setupDeployment.js'
        );
        const { setupAuth } = await import('../../../src/generators/auth-generator/setupAuth.js');
        const { setupStorybook } = await import(
            '../../../src/generators/storybook-generator/setupStorybook.js'
        );
        const { isProvisioningEligible, provisionCloudResources } = await import(
            '../../../src/utils/cloud/index.js'
        );
        const { execa } = await import('execa');
        const fsExtra = await import('fs-extra');

        generateMonorepoProjectSpy = vi.mocked(generateMonorepoProject);
        generateFrameworkProjectSpy = vi.mocked(generateFrameworkProject);
        setupDatabaseSpy = vi.mocked(setupDatabase);
        setupStorageSpy = vi.mocked(setupStorage);
        setupDeploymentSpy = vi.mocked(setupDeployment);
        setupAuthSpy = vi.mocked(setupAuth);
        setupStorybookSpy = vi.mocked(setupStorybook);
        isProvisioningEligibleSpy = vi.mocked(isProvisioningEligible);
        provisionCloudResourcesSpy = vi.mocked(provisionCloudResources);
        execaSpy = vi.mocked(execa);
        _fsWriteFileSpy = vi.mocked(fsExtra.default.writeFile);
        _fsRemoveSpy = vi.mocked(fsExtra.default.remove);

        oraSpy = vi.mocked(ora);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // mockOraInstanceのクリア
        mockOraInstance.start.mockClear();
        mockOraInstance.succeed.mockClear();
        mockOraInstance.fail.mockClear();
        mockOraInstance.info.mockClear();
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllEnvs();
    });

    describe('Monorepoフロー', () => {
        /**
         * config.isMonorepo = true の場合にgenerateMonorepoProjectのみが呼ばれ、
         * その他セットアップ処理（setupDatabaseなど）が呼ばれないことをスパイで検証
         */
        it('Monorepo構成でgenerateMonorepoProjectのみが呼ばれる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'my-monorepo',
                projectPath: '/path/to/my-monorepo',
                framework: 'expo' as const,
                isMonorepo: true,
                workspaceTool: 'turborepo' as const,
                database: 'supabase' as const,
                orm: 'prisma' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: true,
                auth: true,
                mode: 'full' as const,
            };

            generateMonorepoProjectSpy.mockResolvedValue(undefined);

            await runProjectGeneration(config);

            // Monorepo生成が呼ばれる
            expect(generateMonorepoProjectSpy).toHaveBeenCalledWith(config);

            // 通常のセットアップ処理は呼ばれない
            expect(generateFrameworkProjectSpy).not.toHaveBeenCalled();
            expect(setupDatabaseSpy).not.toHaveBeenCalled();
            expect(setupStorageSpy).not.toHaveBeenCalled();
            expect(setupDeploymentSpy).not.toHaveBeenCalled();
            expect(setupAuthSpy).not.toHaveBeenCalled();

            // Monorepo用の開始手順が表示される
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.green('\n✅ Monorepo project created successfully!\n')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.gray(`  cd ${config.projectName}`));
        });

        it('Monorepo構成で正しいコンフィギュレーションが表示される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'test-monorepo',
                projectPath: '/path/to/test-monorepo',
                framework: 'tauri' as const,
                frontendFramework: 'react' as const,
                isMonorepo: true,
                workspaceTool: 'nx' as const,
                database: 'turso' as const,
                orm: 'drizzle' as const,
                storage: 'none' as const,
                packageManager: 'yarn' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateMonorepoProjectSpy.mockResolvedValue(undefined);

            await runProjectGeneration(config);

            // Monorepo設定の表示を確認
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.cyan('\n📦 Creating monorepo project with the following configuration:')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.gray('  Frontend: ') + chalk.white('REACT')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.gray('  Workspace Tool: ') + chalk.white('nx')
            );
        });
    });

    describe('標準フロー（非Monorepo）', () => {
        /**
         * データベース/ストレージ/デプロイ/認証/Storybookの各フラグに応じて
         * 該当のセットアップ関数が呼ばれることを検証
         */
        it('すべてのセットアップが有効な場合に各関数が呼ばれる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'full-app',
                projectPath: '/path/to/full-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'turso' as const,
                orm: 'prisma' as const,
                storage: 'vercel-blob' as const,
                packageManager: 'npm' as const,
                deployment: true,
                auth: true,
                storybook: true,
                mode: 'full' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupDatabaseSpy.mockResolvedValue(undefined);
            setupStorageSpy.mockResolvedValue(undefined);
            setupDeploymentSpy.mockResolvedValue(undefined);
            setupAuthSpy.mockResolvedValue(undefined);
            setupStorybookSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(true);
            provisionCloudResourcesSpy.mockResolvedValue(undefined);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            // テストモードを設定
            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // 各セットアップ関数が呼ばれることを確認
            expect(generateFrameworkProjectSpy).toHaveBeenCalledWith(config);
            expect(setupDatabaseSpy).toHaveBeenCalledWith(config);
            expect(setupStorageSpy).toHaveBeenCalledWith(config);
            expect(setupDeploymentSpy).toHaveBeenCalledWith(config);
            expect(setupAuthSpy).toHaveBeenCalledWith(config);
            expect(setupStorybookSpy).toHaveBeenCalledWith(config);
            expect(provisionCloudResourcesSpy).toHaveBeenCalledWith(config);
        });

        it('データベースとストレージが無効の場合はセットアップがスキップされる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'minimal-app',
                projectPath: '/path/to/minimal-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                storybook: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // データベース・ストレージ関連のセットアップが呼ばれないことを確認
            expect(setupDatabaseSpy).not.toHaveBeenCalled();
            expect(setupStorageSpy).not.toHaveBeenCalled();
            expect(setupDeploymentSpy).not.toHaveBeenCalled();
            expect(setupAuthSpy).not.toHaveBeenCalled();
            expect(setupStorybookSpy).not.toHaveBeenCalled();
            expect(provisionCloudResourcesSpy).not.toHaveBeenCalled();
        });
    });

    describe('認証設定の自動無効化', () => {
        /**
         * Prisma以外のORMを選択した状態で認証を有効にした場合に、
         * 内部で認証が自動的に無効化され警告出力が行われる
         */
        it('Drizzle使用時に認証が無効化される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'drizzle-app',
                projectPath: '/path/to/drizzle-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'turso' as const,
                orm: 'drizzle' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: true, // 認証有効
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupDatabaseSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // 警告メッセージが表示される
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.yellow(
                    '\n⚠ Better Auth scaffolding currently requires Prisma. Authentication will be skipped.'
                )
            );

            // setupAuthが呼ばれないことを確認
            expect(setupAuthSpy).not.toHaveBeenCalled();
        });

        it('Prisma使用時は認証セットアップが実行される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'prisma-app',
                projectPath: '/path/to/prisma-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'supabase' as const,
                orm: 'prisma' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: true,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupDatabaseSpy.mockResolvedValue(undefined);
            setupAuthSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // 警告が表示されないことを確認
            expect(consoleLogSpy).not.toHaveBeenCalledWith(
                expect.stringContaining('Better Auth scaffolding currently requires Prisma')
            );

            // setupAuthが呼ばれることを確認
            expect(setupAuthSpy).toHaveBeenCalledWith(config);
        });
    });

    describe('テストモードでの依存インストールスキップ', () => {
        /**
         * FLUORITE_TEST_MODE === 'true'で依存インストールや外部CLI呼び出しが
         * スキップされることを環境変数とスパイで確認
         */
        it('テストモードで依存インストールがスキップされる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'test-mode-app',
                projectPath: '/path/to/test-mode-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // execaが呼ばれないことを確認
            expect(execaSpy).not.toHaveBeenCalled();

            // スキップメッセージが表示される
            expect(oraSpy).toHaveBeenCalledWith('Skipping dependency installation in test mode');
            expect(mockOraInstance.info).toHaveBeenCalled();
        });

        it('通常モードで依存インストールが実行される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'normal-mode-app',
                projectPath: '/path/to/normal-mode-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'npm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            // テストモードではない
            vi.stubEnv('FLUORITE_TEST_MODE', 'false');

            await runProjectGeneration(config);

            // execaが呼ばれることを確認
            expect(execaSpy).toHaveBeenCalledWith('npm', ['install'], expect.any(Object));
        });
    });

    describe('依存インストール失敗時のエラー処理', () => {
        /**
         * 依存インストール（execa）失敗時にスピナーがfailし、
         * リカバリメッセージをconsole.logする分岐をテスト
         */
        it('依存インストール失敗時にエラーメッセージが表示される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'fail-install-app',
                projectPath: '/path/to/fail-install-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'yarn' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            // execaがエラーを投げる
            const error = new Error('Installation failed');
            execaSpy.mockRejectedValue(error);

            // テストモードではない
            vi.stubEnv('FLUORITE_TEST_MODE', 'false');

            await runProjectGeneration(config);

            // エラーメッセージが表示される
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error.message);

            // リカバリ手順が表示される
            expect(consoleLogSpy).toHaveBeenCalledWith(
                'You can manually install dependencies by running:'
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(`  cd ${config.projectName}`);
            expect(consoleLogSpy).toHaveBeenCalledWith(`  ${config.packageManager} install`);

            // スピナーがfailする
            const mockOraInstance = oraSpy.mock.results[1]?.value; // 2番目のスピナー
            expect(mockOraInstance?.fail).toHaveBeenCalledWith('Failed to install dependencies');
        });
    });

    describe('Flutterプロジェクトの依存インストール', () => {
        /**
         * Flutterの場合は別の依存インストールコマンドが実行される
         */
        it('Flutterプロジェクトでflutter pub getが実行される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'flutter-app',
                projectPath: '/path/to/flutter-app',
                framework: 'flutter' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);
            execaSpy.mockResolvedValue({ stdout: '', stderr: '' });

            // テストモードではない
            vi.stubEnv('FLUORITE_TEST_MODE', 'false');

            await runProjectGeneration(config);

            // flutter pub getが実行される
            expect(execaSpy).toHaveBeenCalledWith(
                'flutter',
                ['pub', 'get'],
                expect.objectContaining({
                    cwd: config.projectPath,
                })
            );
        });

        it('Flutterテストモードで依存インストールがスキップされる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'flutter-test-app',
                projectPath: '/path/to/flutter-test-app',
                framework: 'flutter' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // execaが呼ばれないことを確認
            expect(execaSpy).not.toHaveBeenCalled();

            // Flutterスキップメッセージが表示される
            expect(oraSpy).toHaveBeenCalledWith(
                'Skipping Flutter dependency installation in test mode'
            );
            expect(mockOraInstance.info).toHaveBeenCalled();
        });
    });

    describe('Vercel Blobセットアップ（Next.js固有）', () => {
        /**
         * config.storage === 'vercel-blob' && config.framework === 'nextjs'
         * の場合のスクリプトファイル書き出し処理
         * （実際のロジックはsetupStorage内にあるが、統合的にテスト）
         */
        it('Vercel Blob設定でsetupStorageが呼ばれる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'vercel-blob-app',
                projectPath: '/path/to/vercel-blob-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'vercel-blob' as const,
                packageManager: 'pnpm' as const,
                deployment: true,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupStorageSpy.mockResolvedValue(undefined);
            setupDeploymentSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // setupStorageが呼ばれることを確認
            expect(setupStorageSpy).toHaveBeenCalledWith(config);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.green('✅ vercel-blob storage configured')
            );
        });
    });

    describe('Prisma用DBコマンド実行', () => {
        /**
         * config.database !== 'none' && config.orm === 'prisma'で
         * DBコマンドが実行されることを確認
         * （実際のコマンド実行はsetupDatabase内だが、呼び出しを確認）
         */
        it('Prismaでデータベース設定が呼ばれる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'prisma-db-app',
                projectPath: '/path/to/prisma-db-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'turso' as const,
                orm: 'prisma' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupDatabaseSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // setupDatabaseが呼ばれることを確認
            expect(setupDatabaseSpy).toHaveBeenCalledWith(config);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.cyan('\nSetting up turso database with prisma...')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✅ turso database configured'));
        });
    });

    describe('プロビジョニング対象の判定', () => {
        /**
         * isProvisioningEligibleがtrueを返す場合に
         * provisionCloudResourcesが呼ばれることを確認
         */
        it('プロビジョニング対象の場合にクラウドリソースが作成される', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'cloud-app',
                projectPath: '/path/to/cloud-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'supabase' as const,
                orm: 'prisma' as const,
                storage: 'supabase-storage' as const,
                packageManager: 'pnpm' as const,
                deployment: true,
                auth: false,
                mode: 'full' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            setupDatabaseSpy.mockResolvedValue(undefined);
            setupStorageSpy.mockResolvedValue(undefined);
            setupDeploymentSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(true);
            provisionCloudResourcesSpy.mockResolvedValue(undefined);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // プロビジョニングが実行される
            expect(isProvisioningEligibleSpy).toHaveBeenCalledWith(config);
            expect(provisionCloudResourcesSpy).toHaveBeenCalledWith(config);
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.cyan('\nProvisioning managed services...')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.green('✅ Managed services provisioned')
            );
        });

        it('プロビジョニング対象外の場合はスキップされる', async () => {
            const { runProjectGeneration } = await import(
                '../../../src/commands/create/run-project-generation.js'
            );

            const config = {
                projectName: 'non-cloud-app',
                projectPath: '/path/to/non-cloud-app',
                framework: 'nextjs' as const,
                isMonorepo: false,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            generateFrameworkProjectSpy.mockResolvedValue(undefined);
            isProvisioningEligibleSpy.mockReturnValue(false);

            vi.stubEnv('FLUORITE_TEST_MODE', 'true');

            await runProjectGeneration(config);

            // プロビジョニングが実行されない
            expect(provisionCloudResourcesSpy).not.toHaveBeenCalled();
        });
    });
});
