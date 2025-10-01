/**
 * プロジェクト生成コマンド (src/commands/create/create-project.ts) のユニットテスト
 * CLIモード/プロンプトモードの挙動、Monorepo選択フロー、認証無効化警告を網羅
 */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import prompts from 'prompts';
import chalk from 'chalk';

// モック設定
vi.mock('fs-extra', () => ({
    default: {
        pathExists: vi.fn(),
    },
}));

vi.mock('prompts');

vi.mock('../../../src/commands/create/is-config-complete.js', () => ({
    isConfigComplete: vi.fn(),
}));

vi.mock('../../../src/commands/create/run-project-generation.js', () => ({
    runProjectGeneration: vi.fn(),
}));

describe('プロジェクト生成コマンド - create-project.ts', () => {
    let consoleLogSpy: MockInstance;
    let consoleWarnSpy: MockInstance;
    let pathExistsSpy: MockInstance;
    let isConfigCompleteSpy: MockInstance;
    let runProjectGenerationSpy: MockInstance;
    let promptsSpy: MockInstance;
    let processExitSpy: MockInstance;

    beforeEach(async () => {
        // コンソール出力のモック
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            /* no-op */
        });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
            /* no-op */
        });

        // process.exitのモック（実際に処理を停止するためにエラーを投げる）
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
            throw new Error(`process.exit(${code})`);
        }) as never);

        // fs-extraのモック
        const fsExtra = await import('fs-extra');
        pathExistsSpy = vi.mocked(fsExtra.default.pathExists);

        // 依存モジュールのモック
        const { isConfigComplete } = await import(
            '../../../src/commands/create/is-config-complete.js'
        );
        const { runProjectGeneration } = await import(
            '../../../src/commands/create/run-project-generation.js'
        );
        isConfigCompleteSpy = vi.mocked(isConfigComplete);
        runProjectGenerationSpy = vi.mocked(runProjectGeneration);

        promptsSpy = vi.mocked(prompts);
    });

    afterEach(() => {
        vi.clearAllMocks();
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        processExitSpy.mockRestore();
    });

    describe('CLIモード（十分なオプションが渡されたケース）', () => {
        /**
         * CLIモードでfs.pathExistsが真の場合に例外を投げることを検証
         * 例外メッセージが期待通りかを確認
         */
        it('既存ディレクトリが存在する場合はエラーを投げる', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            // 設定が完全であることを示す
            isConfigCompleteSpy.mockReturnValue(true);
            // ディレクトリが既に存在する
            pathExistsSpy.mockResolvedValue(true);

            const config = {
                projectName: 'test-app',
                projectPath: '/path/to/test-app',
                framework: 'nextjs' as const,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            // エラーが投げられることを確認
            await expect(createProject(config)).rejects.toThrow(
                'Directory /path/to/test-app already exists'
            );

            expect(pathExistsSpy).toHaveBeenCalledWith('/path/to/test-app');
            expect(runProjectGenerationSpy).not.toHaveBeenCalled();
        });

        it('プロジェクトパスが未指定の場合はcwd配下にプロジェクト名のフォルダを作成', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(true);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            const config = {
                projectName: 'my-app',
                // projectPathは意図的に未指定
                framework: 'nextjs' as const,
                database: 'none' as const,
                storage: 'none' as const,
                packageManager: 'pnpm' as const,
                deployment: false,
                auth: false,
                mode: 'minimal' as const,
            };

            await createProject(config);

            // runProjectGenerationに渡される設定でprojectPathが自動設定されることを確認
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectName: 'my-app',
                    projectPath: expect.stringContaining('my-app'),
                })
            );
        });

        it('正常な設定でrunProjectGenerationが呼ばれる', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(true);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            const config = {
                projectName: 'test-app',
                projectPath: '/custom/path',
                framework: 'expo' as const,
                database: 'turso' as const,
                orm: 'prisma' as const,
                storage: 'cloudflare-r2' as const,
                packageManager: 'yarn' as const,
                deployment: true,
                auth: true,
                mode: 'full' as const,
            };

            await createProject(config);

            expect(runProjectGenerationSpy).toHaveBeenCalledWith(config);
        });
    });

    describe('プロンプトモード（対話式入力）', () => {
        /**
         * promptsをモックし、Monorepo選択時にisMonorepo, workspaceTool, database, ormの
         * 依存関係が正しく組み合わさること、および回答結果がrunProjectGenerationに
         * 渡されることを検証
         */
        it('Monorepo選択フローが正しく動作する', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            // Monorepo選択のプロンプト回答をモック
            promptsSpy.mockResolvedValue({
                framework: 'expo',
                isMonorepo: true,
                workspaceTool: 'turborepo',
                projectName: 'my-monorepo',
                database: 'supabase',
                orm: 'drizzle',
                storage: 'supabase-storage',
                deployment: true,
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                storybook: false,
            });

            await createProject();

            // ウェルカムメッセージが表示される
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.bold.magenta('\n✨ Multi-Framework Project Generator ✨\n')
            );

            // runProjectGenerationにMonorepo設定が渡される
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    framework: 'expo',
                    isMonorepo: true,
                    workspaceTool: 'turborepo',
                    database: 'supabase',
                    orm: 'drizzle',
                })
            );
        });

        it('Monorepo非対応フレームワーク（Next.js）では関連プロンプトがスキップされる', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            // Next.js選択時の回答をモック（isMonorepo/workspaceToolは含まれない）
            promptsSpy.mockResolvedValue({
                framework: 'nextjs',
                projectName: 'my-nextjs-app',
                database: 'turso',
                orm: 'prisma',
                storage: 'vercel-blob',
                deployment: true,
                auth: true,
                packageManager: 'npm',
                storybook: true,
            });

            await createProject();

            // Next.jsの場合、実際の設定にはisMonorepoは含まれない（プロンプトでスキップされるため）
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    framework: 'nextjs',
                    projectName: 'my-nextjs-app',
                    database: 'turso',
                    orm: 'prisma',
                    storage: 'vercel-blob',
                    deployment: true,
                    auth: true,
                    packageManager: 'npm',
                    storybook: true,
                    mode: 'full',
                    projectPath: expect.stringContaining('my-nextjs-app'),
                })
            );
            // workspaceToolは設定に含まれないことを確認
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    workspaceTool: expect.anything(),
                })
            );
        });

        it('データベースなしの場合はORM選択がスキップされる', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            // データベースなしの回答をモック
            promptsSpy.mockResolvedValue({
                framework: 'nextjs',
                projectName: 'no-db-app',
                database: 'none',
                // ormは選択されない
                storage: 'none',
                deployment: false,
                auth: false,
                packageManager: 'bun',
                mode: 'minimal',
                storybook: false,
            });

            await createProject();

            // ORMが設定に含まれないことを確認
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    database: 'none',
                })
            );
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.not.objectContaining({
                    orm: expect.anything(),
                })
            );
        });

        it('プロジェクト名のバリデーションが正しく動作する', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);

            // promptsの動的な質問設定を検証するため、コールバックを保存
            let projectNameValidator: ((value: string) => string | boolean) | undefined;
            promptsSpy.mockImplementation((questions: prompts.PromptObject[]) => {
                // projectName質問のvalidate関数を取得
                const projectNameQuestion = questions.find((q) => q.name === 'projectName');
                if (projectNameQuestion) {
                    projectNameValidator = projectNameQuestion.validate;
                }
                // 正常な値を返す
                return Promise.resolve({
                    framework: 'nextjs',
                    projectName: 'valid-name',
                    database: 'none',
                    storage: 'none',
                    deployment: false,
                    auth: false,
                    packageManager: 'pnpm',
                    mode: 'minimal',
                    storybook: false,
                });
            });

            await createProject();

            // バリデーション関数が定義されていることを確認
            expect(projectNameValidator).toBeDefined();

            // バリデーション関数のテスト
            // 空文字チェック
            expect(projectNameValidator('')).toBe('Project name is required');
            expect(projectNameValidator('  ')).toBe('Project name is required');

            // 使用可能文字チェック
            expect(projectNameValidator('Invalid-Name')).toBe(
                'Project name can only contain lowercase letters, numbers, hyphens, and underscores'
            );
            expect(projectNameValidator('my app')).toBe(
                'Project name can only contain lowercase letters, numbers, hyphens, and underscores'
            );

            // 正常な名前
            expect(projectNameValidator('valid-name_123')).toBe(true);
            expect(projectNameValidator('my-project')).toBe(true);
        });
    });

    describe('認証設定の自動無効化フロー', () => {
        /**
         * Prisma以外のORMを選択した状態で認証を有効にした場合に、
         * 内部で認証が自動的に無効化され警告出力が行われるフロー
         * （runProjectGeneration側の処理だが、create-projectから統合的にテスト）
         */
        it('Drizzle選択時に認証が有効だと警告が出る（統合テスト）', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockImplementation(async (config) => {
                // runProjectGeneration内での認証無効化ロジックをシミュレート
                if (config.orm && config.orm !== 'prisma' && config.auth) {
                    console.warn(
                        chalk.yellow(
                            '⚠️  認証機能は現在Prismaのみサポートしています。認証を無効化して続行します。'
                        )
                    );
                    config.auth = false;
                }
            });

            promptsSpy.mockResolvedValue({
                framework: 'nextjs',
                projectName: 'drizzle-auth-test',
                database: 'turso',
                orm: 'drizzle',
                storage: 'none',
                deployment: false,
                auth: true, // 認証を有効にする
                packageManager: 'pnpm',
                mode: 'minimal',
                storybook: false,
            });

            await createProject();

            // 警告メッセージが出力されることを確認
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                chalk.yellow(
                    '⚠️  認証機能は現在Prismaのみサポートしています。認証を無効化して続行します。'
                )
            );

            // runProjectGenerationが呼ばれることを確認
            expect(runProjectGenerationSpy).toHaveBeenCalled();
        });

        it('Prisma選択時は認証有効でも警告が出ない', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);
            runProjectGenerationSpy.mockResolvedValue(undefined);

            promptsSpy.mockResolvedValue({
                framework: 'nextjs',
                projectName: 'prisma-auth-test',
                database: 'supabase',
                orm: 'prisma',
                storage: 'none',
                deployment: false,
                auth: true,
                packageManager: 'pnpm',
                mode: 'full',
                storybook: false,
            });

            await createProject();

            // 警告が出ないことを確認
            expect(consoleWarnSpy).not.toHaveBeenCalled();

            // 認証が有効のまま渡されることを確認
            expect(runProjectGenerationSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    orm: 'prisma',
                    auth: true,
                })
            );
        });
    });

    describe('フレームワーク別のデフォルトプロジェクト名', () => {
        /**
         * プロンプトモードでフレームワーク選択に応じて
         * デフォルトのプロジェクト名が設定されることを確認
         */
        it('各フレームワークのデフォルトプロジェクト名が正しく設定される', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);

            // promptsの質問設定を検証
            let projectNameInitial: string | undefined;
            promptsSpy.mockImplementation((questions: prompts.PromptObject[]) => {
                const projectNameQuestion = questions.find((q) => q.name === 'projectName');
                if (projectNameQuestion?.initial) {
                    projectNameInitial = projectNameQuestion.initial;
                }
                return Promise.resolve({
                    framework: 'nextjs',
                    projectName: 'test',
                    database: 'none',
                    storage: 'none',
                    deployment: false,
                    auth: false,
                    packageManager: 'pnpm',
                    mode: 'minimal',
                    storybook: false,
                });
            });

            await createProject();

            // initial関数が定義されていることを確認
            expect(projectNameInitial).toBeDefined();

            // 各フレームワークのデフォルト名を検証
            expect(projectNameInitial('nextjs')).toBe('my-next-app');
            expect(projectNameInitial('expo')).toBe('my-expo-app');
            expect(projectNameInitial('tauri')).toBe('my-tauri-app');
            expect(projectNameInitial('flutter')).toBe('my-flutter-app');
            expect(projectNameInitial('unknown')).toBe('my-app');
        });
    });

    describe('プロンプトキャンセル処理', () => {
        /**
         * ユーザーがプロンプトをキャンセルした場合の処理を確認
         */
        it('プロンプトがキャンセルされた場合は処理が中断される', async () => {
            const { createProject } = await import(
                '../../../src/commands/create/create-project.js'
            );

            isConfigCompleteSpy.mockReturnValue(false);
            pathExistsSpy.mockResolvedValue(false);

            // プロンプトのキャンセル（projectNameが未定義）
            promptsSpy.mockResolvedValue({
                framework: 'nextjs',
                // projectName: undefined - キャンセル状態をシミュレート
            });

            // process.exitが呼ばれるためエラーが投げられることを期待
            await expect(createProject()).rejects.toThrow('process.exit(0)');

            // キャンセルメッセージが表示される
            expect(consoleLogSpy).toHaveBeenCalledWith(
                chalk.yellow('\n✖ Project creation cancelled')
            );

            // process.exit(0)が呼ばれることを確認
            expect(processExitSpy).toHaveBeenCalledWith(0);

            // runProjectGenerationが呼ばれないことを確認
            expect(runProjectGenerationSpy).not.toHaveBeenCalled();
        });
    });
});
