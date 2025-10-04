/**
 * CLI 実行ヘルパー群。テスト環境で `src/cli.ts` やビルド済み CLI を起動し、
 * 出力・終了コードを収集したり、対話的入力やユーティリティ的な検証関数を提供する。
 * Vitest の機能テストから直接利用し、実際の CLI 振る舞いを再現することを目的としている。
 */
import { type SpawnOptionsWithoutStdio, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(projectRoot, 'src/cli.ts');

export interface CliResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

/**
 * CLI (ソース版) を指定引数で実行し、標準出力・標準エラー・終了コードを取得する。
 */
export function runCli(
    args: string[] = [],
    options: SpawnOptionsWithoutStdio = {}
): Promise<CliResult> {
    return new Promise((resolve) => {
        const env = {
            ...process.env,
            FLUORITE_TEST_MODE: 'true',
            FLUORITE_CLOUD_MODE: 'mock',
            NODE_ENV: 'test',
            ...options.env,
        };

        const child = spawn('tsx', [cliPath, ...args], {
            ...options,
            env,
            cwd: options.cwd || process.cwd(),
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (exitCode) => {
            resolve({ stdout, stderr, exitCode });
        });

        child.on('error', (error) => {
            stderr += error.toString();
            resolve({ stdout, stderr, exitCode: 1 });
        });
    });
}

/**
 * CLI を対話形式で実行し、指定した入力列を擬似的に流し込む。
 */
export function runCliInteractive(
    args: string[] = [],
    inputs: string[] = [],
    options: SpawnOptionsWithoutStdio = {}
): Promise<CliResult> {
    return new Promise((resolve) => {
        const env = {
            ...process.env,
            FLUORITE_TEST_MODE: 'true',
            FLUORITE_CLOUD_MODE: 'mock',
            NODE_ENV: 'test',
            ...options.env,
        };

        const child = spawn('tsx', [cliPath, ...args], {
            ...options,
            env,
            cwd: options.cwd || process.cwd(),
        });

        let stdout = '';
        let stderr = '';
        let inputIndex = 0;

        child.stdout?.on('data', (data) => {
            stdout += data.toString();

            // プロンプトが表示されたタイミングで入力を順番に送信する
            if (inputIndex < inputs.length) {
                setTimeout(() => {
                    if (child.stdin && inputIndex < inputs.length) {
                        child.stdin.write(`${inputs[inputIndex]}\n`);
                        inputIndex++;
                    }
                }, 100);
            }
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (exitCode) => {
            resolve({ stdout, stderr, exitCode });
        });

        child.on('error', (error) => {
            stderr += error.toString();
            resolve({ stdout, stderr, exitCode: 1 });
        });
    });
}

/**
 * ビルド済み CLI (`dist/cli.js`) を実行して結果を取得する。
 */
export function runDistCli(
    args: string[] = [],
    options: SpawnOptionsWithoutStdio = {}
): Promise<CliResult> {
    const distCliPath = path.join(projectRoot, 'dist/cli.js');

    return new Promise((resolve) => {
        const env = {
            ...process.env,
            FLUORITE_TEST_MODE: 'true',
            FLUORITE_CLOUD_MODE: 'mock',
            NODE_ENV: 'test',
            ...options.env,
        };

        const child = spawn('node', [distCliPath, ...args], {
            ...options,
            env,
            cwd: options.cwd || process.cwd(),
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (exitCode) => {
            resolve({ stdout, stderr, exitCode });
        });

        child.on('error', (error) => {
            stderr += error.toString();
            resolve({ stdout, stderr, exitCode: 1 });
        });
    });
}

/**
 * CLI の標準出力または標準エラーに指定テキストが含まれているか判定する。
 */
export function expectOutput(result: CliResult, expectedText: string | RegExp): boolean {
    if (typeof expectedText === 'string') {
        return result.stdout.includes(expectedText) || result.stderr.includes(expectedText);
    }
    return expectedText.test(result.stdout) || expectedText.test(result.stderr);
}

/**
 * CLI が正常終了 (exit code 0) したかどうかを返す。
 */
export function expectSuccess(result: CliResult): boolean {
    return result.exitCode === 0;
}

/**
 * CLI が指定した終了コードで失敗したかどうかを返す。
 */
export function expectFailure(result: CliResult, expectedCode = 1): boolean {
    return result.exitCode === expectedCode;
}

/**
 * CLI 出力に含まれる JSON を抽出してパースする。その他テキストと混在するケースも想定する。
 */
export function parseJsonOutput<T = Record<string, unknown>>(result: CliResult): T | null {
    try {
        // 出力中の JSON 断片を抽出してパースする
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        // 全体が JSON であればそのままパース
        return JSON.parse(result.stdout);
    } catch {
        return null;
    }
}

/**
 * 条件関数が真になるまで待機するためのユーティリティ。ポーリング間隔とタイムアウトを指定可能。
 */
export async function waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return false;
}
