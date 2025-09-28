import { spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
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
 * Run the CLI command with given arguments
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
 * Run the CLI command with interactive input simulation
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

            // Simulate user input when prompted
            if (inputIndex < inputs.length) {
                // Wait a bit to ensure the prompt is ready
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
 * Run a built CLI command (dist version)
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
 * Check if CLI output contains expected text
 */
export function expectOutput(result: CliResult, expectedText: string | RegExp): boolean {
    if (typeof expectedText === 'string') {
        return result.stdout.includes(expectedText) || result.stderr.includes(expectedText);
    }
    return expectedText.test(result.stdout) || expectedText.test(result.stderr);
}

/**
 * Check if CLI exited successfully
 */
export function expectSuccess(result: CliResult): boolean {
    return result.exitCode === 0;
}

/**
 * Check if CLI failed with expected exit code
 */
export function expectFailure(result: CliResult, expectedCode = 1): boolean {
    return result.exitCode === expectedCode;
}

/**
 * Parse JSON output from CLI
 */
export function parseJsonOutput<T = Record<string, unknown>>(result: CliResult): T | null {
    try {
        // Try to extract JSON from the output (might be mixed with other text)
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        // Try parsing the entire output
        return JSON.parse(result.stdout);
    } catch {
        return null;
    }
}

/**
 * Helper to wait for a condition with timeout
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
