/**
 * CLI の `create`/`new` コマンドに関する機能テスト。
 * Next.js などのプロジェクト生成フローにおいて、ヘルプ表示・必須引数の検証・
 * フレームワークごとの入力制約など、ユーザーが実行時に遭遇し得るケースを網羅的に確認する。
 * テストでは一時ディレクトリを利用して生成物の有無を検証し、副作用を残さないようにしている。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    expectFailure,
    expectOutput,
    expectSuccess,
    runCli,
    runCliInteractive,
} from '../../helpers/cli-runner.js';
import { cleanupAllTempDirs, createTempDir, projectFileExists } from '../../helpers/temp-dir.js';

describe('CLI create コマンドの機能確認', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await createTempDir('ff-cli-test-');
    });

    afterEach(async () => {
        await cleanupAllTempDirs();
    });

    describe('ヘルプ表示と基本的な使い方', () => {
        it('create コマンドのヘルプを表示できること', async () => {
            const result = await runCli(['create', '--help']);

            expectSuccess(result);
            expectOutput(result, 'Create a new project');
        });

        it('エイリアス new コマンドでもヘルプが表示されること', async () => {
            const result = await runCli(['new', '--help']);

            expectSuccess(result);
            expectOutput(result, 'Create a new project');
        });
    });

    describe('コマンドライン引数の検証', () => {
        it('必須オプションを全て指定するとプロジェクトが生成されること', async () => {
            const projectPath = `${tempDir}/test-project`;
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--path',
                projectPath,
                '--framework',
                'nextjs',
                '--database',
                'none',
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
                '--mode',
                'test', // 実際の依存関係インストールを避けるためテストモードを利用する
            ]);

            expectSuccess(result);
            expectOutput(result, /test-project/);

            // 生成されたプロジェクトに package.json が存在することを確認する
            expect(await projectFileExists(projectPath, 'package.json')).toBe(true);
        });

        it('必須オプション不足の場合はエラーになること', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                // 必須引数を欠如させてバリデーションエラーを誘発する
                '--framework',
                'nextjs',
            ]);

            expectFailure(result);
        });

        it('存在しないフレームワーク指定を拒否すること', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'invalid-framework',
                '--path',
                `${tempDir}/test`,
                '--database',
                'none',
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('不正なデータベース種別を拒否すること', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'invalid-db',
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });
    });

    describe('フレームワーク固有の制約', () => {
        it('Flutter ではデータベース選択ができないこと', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-flutter',
                '--framework',
                'flutter',
                '--database',
                'turso', // Flutter ではデータベースオプションをサポートしないためエラーになることを確認する
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('Tauri ではストレージ選択ができないこと', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-tauri',
                '--framework',
                'tauri',
                '--database',
                'none',
                '--storage',
                'vercel-blob', // Tauri ではストレージオプションをサポートしないためエラーになることを確認する
                '--path',
                `${tempDir}/test`,
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('データベース選択時は ORM の指定を必須とすること', async () => {
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'turso',
                // --orm フラグを意図的に省略しバリデーションエラーを発生させる
                '--path',
                `${tempDir}/test`,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
            ]);

            expectFailure(result);
        });

        it('データベースと ORM を併用した場合に成功すること', async () => {
            const projectPath = `${tempDir}/test-project`;
            const result = await runCli([
                'create',
                '--name',
                'test-project',
                '--framework',
                'nextjs',
                '--database',
                'turso',
                '--orm',
                'prisma', // ORM を正しく指定したパターン
                '--path',
                projectPath,
                '--storage',
                'none',
                '--no-deployment',
                '--no-auth',
                '--package-manager',
                'pnpm',
                '--mode',
                'test',
            ]);

            expectSuccess(result);
        });
    });
});
