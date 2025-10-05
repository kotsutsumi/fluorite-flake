/**
 * CLI実行ヘルパー
 * E2Eテストでfluorite CLIコマンドを実行するためのユーティリティ
 */

import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../../../dist/cli.js");

// CLI実行結果の型定義
export type CLIResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
};

// CLI実行オプション
export type CLIOptions = {
    cwd?: string;
    timeout?: number;
    env?: Record<string, string>;
    input?: string;
};

/**
 * fluorite CLIコマンドを実行する
 */
export async function runCLI(
    args: string[],
    options: CLIOptions = {}
): Promise<CLIResult> {
    const startTime = Date.now();

    try {
        const result = await execa("node", [CLI_PATH, ...args], {
            cwd: options.cwd || process.cwd(),
            timeout: options.timeout || 30_000,
            env: {
                ...process.env,
                NODE_ENV: "test",
                FLUORITE_LOCALE: "ja",
                ...options.env,
            },
            input: options.input,
            reject: false, // エラーコードでもPromiseを拒否しない
        });

        return {
            exitCode: result.exitCode || 0,
            stdout: result.stdout,
            stderr: result.stderr,
            duration: Date.now() - startTime,
        };
    } catch (error) {
        const duration = Date.now() - startTime;

        if (error instanceof Error && "exitCode" in error) {
            return {
                exitCode: (error as any).exitCode || 1,
                stdout: (error as any).stdout || "",
                stderr: (error as any).stderr || error.message,
                duration,
            };
        }

        return {
            exitCode: 1,
            stdout: "",
            stderr: error instanceof Error ? error.message : String(error),
            duration,
        };
    }
}

/**
 * インタラクティブなCLIプロセスを起動する
 */
export function spawnCLI(
    args: string[],
    options: CLIOptions = {}
): ChildProcess {
    return spawn("node", [CLI_PATH, ...args], {
        cwd: options.cwd || process.cwd(),
        env: {
            ...process.env,
            NODE_ENV: "test",
            FLUORITE_LOCALE: "ja",
            ...options.env,
        },
        stdio: ["pipe", "pipe", "pipe"],
    });
}

/**
 * プロセスの出力を待機する
 */
export function waitForOutput(
    child: ChildProcess,
    pattern: string | RegExp,
    timeout = 5000
): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = "";
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for pattern: ${pattern}`));
        }, timeout);

        const onData = (data: Buffer) => {
            output += data.toString();
            const matches =
                typeof pattern === "string"
                    ? output.includes(pattern)
                    : pattern.test(output);

            if (matches) {
                clearTimeout(timer);
                child.stdout?.off("data", onData);
                resolve(output);
            }
        };

        child.stdout?.on("data", onData);
    });
}

/**
 * プロセスにキー入力を送信する
 */
export function sendKey(child: ChildProcess, key: string): void {
    if (child.stdin) {
        child.stdin.write(key);
    }
}

/**
 * プロセスを安全に終了する
 */
export function killProcess(child: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
        if (child.killed) {
            resolve();
            return;
        }

        child.on("exit", () => resolve());
        child.kill("SIGTERM");

        // 強制終了のフォールバック
        setTimeout(() => {
            if (!child.killed) {
                child.kill("SIGKILL");
            }
        }, 2000);
    });
}

/**
 * CLIの実行可能性をチェック
 */
export async function checkCLIAvailable(): Promise<boolean> {
    try {
        const result = await runCLI(["--version"], { timeout: 5000 });
        return result.exitCode === 0;
    } catch {
        return false;
    }
}

/**
 * パフォーマンステスト用のベンチマーク実行
 */
export async function benchmark(
    name: string,
    fn: () => Promise<CLIResult>,
    iterations = 5
): Promise<{
    name: string;
    averageTime: number;
    minTime: number;
    maxTime: number;
    results: CLIResult[];
}> {
    const results: CLIResult[] = [];

    for (let i = 0; i < iterations; i++) {
        const result = await fn();
        results.push(result);
    }

    const times = results.map((r) => r.duration);
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
        name,
        averageTime,
        minTime,
        maxTime,
        results,
    };
}

// EOF
