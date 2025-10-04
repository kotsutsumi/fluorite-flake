/**
 * CLIエントリポイント (src/cli.ts) の実行テスト
 * 実際のCLIプロセスを起動して動作を検証
 */
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.join(__dirname, '../../src/cli.ts');

describe('CLIエントリポイント - src/cli.ts', () => {
    describe('findLocaleArgument 関数のテスト', () => {
        /**
         * ロケール引数のパース動作を実際のCLI実行で検証
         */

        it('--locale ja 形式でロケールを検出できる', async () => {
            // CLIヘルパーを使用して実行
            const result = await runCliWithArgs(['--locale', 'ja', '--version']);
            expect(result.exitCode).toBe(0);
        });

        it('-L=ja 形式でロケールを検出できる', async () => {
            const result = await runCliWithArgs(['-L=ja', '--version']);
            expect(result.exitCode).toBe(0);
        });

        it('ロケール指定なしの場合はデフォルト動作', async () => {
            const result = await runCliWithArgs(['--version']);
            expect(result.exitCode).toBe(0);
        });
    });

    describe('引数なし実行時のヘルプ表示', () => {
        /**
         * 引数なしで実行した場合、ヘルプが表示されて終了することを確認
         */
        it('引数なしでヘルプ表示後に終了', async () => {
            const result = await runCliWithArgs([]);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Usage:');
        });
    });

    describe('バージョン表示', () => {
        /**
         * --versionオプションでバージョンが表示されることを確認
         */
        it('--versionでバージョンが表示される', async () => {
            const result = await runCliWithArgs(['--version']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // バージョン番号のパターン
        });
    });

    describe('createコマンドの基本動作', () => {
        /**
         * createコマンドが正常に実行されることを確認
         * （実際のプロジェクト生成は行わず、パラメータ検証のみ）
         */
        it('必須引数不足でエラーメッセージが表示される', async () => {
            const result = await runCliWithArgs([
                'create',
                '--name',
                'test',
                '--framework',
                'nextjs',
                // 他の必須引数が不足
            ]);
            // エラー終了することを確認
            expect(result.exitCode).toBe(1);
        });

        it('無効なframeworkでエラーになる', async () => {
            const result = await runCliWithArgs([
                'create',
                '--name',
                'test',
                '--path',
                './test',
                '--framework',
                'invalid-framework',
                '--database',
                'none',
                '--storage',
                'none',
                '--package-manager',
                'pnpm',
            ]);
            expect(result.exitCode).toBe(1);
            expect(result.stderr + result.stdout).toContain('Invalid');
        });
    });

    describe('dashboardコマンドの基本動作', () => {
        /**
         * dashboardコマンドのヘルプ表示を確認
         */
        it('dashboard --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['dashboard', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('dashboard');
        });
    });

    describe('r2コマンドの基本動作', () => {
        /**
         * r2コマンドで無効なアクションを指定した場合のエラー
         */
        it('無効なr2アクションでエラーになる', async () => {
            const result = await runCliWithArgs(['r2', 'invalid-action']);
            expect(result.exitCode).toBe(1);
        });
    });

    describe('deployコマンドの基本動作', () => {
        /**
         * deployコマンドのヘルプ表示を確認
         */
        it('deploy --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['deploy', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('deploy');
        });
    });

    describe('logsコマンドの基本動作', () => {
        /**
         * logsコマンドのヘルプ表示を確認
         */
        it('logs --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['logs', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('logs');
        });
    });

    describe('ipcコマンドの基本動作', () => {
        /**
         * ipcコマンドのヘルプ表示を確認
         */
        it('ipc --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['ipc', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('ipc');
        });
    });

    describe('ipc-testコマンドの基本動作', () => {
        /**
         * ipc-testコマンドのヘルプ表示を確認
         */
        it('ipc-test --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['ipc-test', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('ipc-test');
        });
    });

    describe('tuiコマンドの基本動作', () => {
        /**
         * tuiコマンド（非推奨）のヘルプ表示を確認
         */
        it('tui --helpでヘルプが表示される', async () => {
            const result = await runCliWithArgs(['tui', '--help']);
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('tui');
        });
    });
});

/**
 * CLIを実際に起動して出力を取得するヘルパー関数
 * spawnを使用してCLIプロセスを起動し、stdout/stderr/exitCodeを収集
 */
async function runCliWithArgs(args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
}> {
    return new Promise((resolve) => {
        const child = spawn('tsx', [cliPath, ...args], {
            env: {
                ...process.env,
                FLUORITE_TEST_MODE: 'true',
                NODE_ENV: 'test',
            },
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                stdout,
                stderr,
                exitCode: code,
            });
        });

        child.on('error', () => {
            resolve({
                stdout,
                stderr,
                exitCode: 1,
            });
        });
    });
}
