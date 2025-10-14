#!/usr/bin/env tsx
/**
 * Vercel環境変数操作用の共通ユーティリティ
 * 環境変数の管理、暗号化・復号化機能を提供
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

/**
 * プロジェクト設定の型定義
 */
export type ProjectConfig = {
    readonly orgId: string;
    readonly projectId: string;
};

/**
 * プロジェクトルートディレクトリを検出する
 * モノレポルートから実行された場合は、package.jsonが存在するプロジェクトディレクトリを探す
 */
export function detectProjectRoot(): string {
    const currentDir = process.cwd();

    // 現在のディレクトリに package.json があるかチェック
    if (existsSync(join(currentDir, 'package.json'))) {
        return currentDir;
    }

    // モノレポルートから実行された場合を想定し、共通パターンを検索
    const commonPaths = [
        join(currentDir, 'apps', 'backend'),
        join(currentDir, 'backend'),
        join(currentDir, 'server'),
        join(currentDir, 'api'),
    ];

    for (const path of commonPaths) {
        if (existsSync(join(path, 'package.json'))) {
            console.log(`📁 プロジェクトディレクトリを検出: ${path}`);
            return path;
        }
    }

    // 見つからない場合は現在のディレクトリを返す
    console.warn('⚠️  プロジェクトディレクトリが見つかりません。現在のディレクトリを使用します。');
    return currentDir;
}

/**
 * 環境変数マップの型定義
 */
export type EnvMap = Map<string, string>;

/**
 * データベース種別の型定義
 */
export type DatabaseType = 'turso' | 'supabase';

/**
 * 環境タイプの型定義
 */
export type EnvironmentType = 'development' | 'staging' | 'production';

/**
 * Vercel環境タイプの型定義
 */
export type VercelEnvironmentType = 'development' | 'preview' | 'production';

/**
 * 環境ごとのサフィックス定義
 */
const ENVIRONMENT_SUFFIX_MAP: Record<EnvironmentType, string> = {
    development: 'DEV',
    staging: 'STG',
    production: 'PROD',
};

/**
 * 環境に応じたサフィックスを取得する
 */
export function getEnvironmentSuffix(environment: EnvironmentType): string {
    return ENVIRONMENT_SUFFIX_MAP[environment];
}

/**
 * 環境ごとの複製キー一覧を取得する
 */
export function resolveEnvironmentKeys(key: string, environment: EnvironmentType): string[] {
    const suffix = getEnvironmentSuffix(environment);
    const suffixToken = `_${suffix}`;
    const keys = new Set<string>();

    keys.add(key);

    if (key.endsWith(suffixToken)) {
        const baseKey = key.slice(0, -suffixToken.length);
        if (baseKey.length > 0) {
            keys.add(baseKey);
        }
    } else {
        keys.add(`${key}${suffixToken}`);
    }

    return Array.from(keys);
}

/**
 * プロジェクト設定を読み込む
 */
export async function readProjectConfig(): Promise<ProjectConfig> {
    const projectRoot = detectProjectRoot();
    const configPath = resolve(projectRoot, '.vercel/project.json');

    try {
        const raw = await readFile(configPath, 'utf8');
        const parsed = JSON.parse(raw) as {
            orgId?: string;
            projectId?: string;
        };

        if (!parsed.orgId || !parsed.projectId) {
            throw new Error('Missing orgId or projectId in .vercel/project.json');
        }

        return { orgId: parsed.orgId, projectId: parsed.projectId };
    } catch (error) {
        throw new Error(
            `Failed to read project config: ${error instanceof Error ? error.message : error}\n` +
                'Please run "vercel link" first to set up the project.'
        );
    }
}

/**
 * 環境ファイルを読み込む
 */
export async function readEnvFile(filePath: string): Promise<EnvMap> {
    try {
        const raw = await readFile(filePath, 'utf8');
        const map: EnvMap = new Map();

        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) {
                continue;
            }

            const key = trimmed.slice(0, eqIndex).trim();
            let value = trimmed.slice(eqIndex + 1).trim();

            // クォートを除去
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }

            map.set(key, value);
        }

        return map;
    } catch (error) {
        throw new Error(
            `Failed to read environment file ${filePath}: ${error instanceof Error ? error.message : error}`
        );
    }
}

/**
 * Vercel CLIを実行する
 */
export function runVercel(
    args: string[],
    input: string | undefined,
    env: NodeJS.ProcessEnv
): Promise<string> {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn('vercel', args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            env,
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });

        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });

        child.on('error', (error) => {
            rejectPromise(new Error(`Failed to run vercel command: ${error.message}`));
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolvePromise(stdout);
                return;
            }

            const message = `vercel ${args.join(' ')} failed with exit code ${code}\n${stdout}${stderr}`;
            rejectPromise(new Error(message));
        });

        if (input !== undefined) {
            child.stdin.write(input);
        }
        child.stdin.end();
    });
}

/**
 * データベースタイプを検出する
 */
export function detectDatabaseType(envMap: EnvMap): DatabaseType {
    // Tursoの環境変数が存在する場合
    const hasTurso = Array.from(envMap.keys()).some(
        (key) => key.includes('TURSO_DATABASE_URL') || key.includes('TURSO_AUTH_TOKEN')
    );

    // Supabaseの環境変数が存在する場合
    const hasSupabase = Array.from(envMap.keys()).some(
        (key) => key.includes('SUPABASE_URL') || key.includes('SUPABASE_ANON_KEY')
    );

    if (hasTurso && hasSupabase) {
        console.warn(
            '⚠️  Both Turso and Supabase environment variables detected. Using Turso as default.'
        );
        return 'turso';
    }

    if (hasSupabase) {
        return 'supabase';
    }

    // デフォルトはTurso
    return 'turso';
}

/**
 * 環境変数を指定した環境に適用する
 */
export async function applyToEnvironment(
    key: string,
    value: string,
    target: VercelEnvironmentType,
    env: NodeJS.ProcessEnv
): Promise<void> {
    // 既存の環境変数を削除（エラーは無視）
    const removeArgs = ['env', 'rm', key, target, '-y'];
    try {
        await runVercel(removeArgs, undefined, env);
        console.log(`  ✓ Removed existing ${key} from ${target}`);
    } catch {
        // 変数が存在しない場合は無視
    }

    // 新しい環境変数を追加
    const addArgs = ['env', 'add', key, target];
    await runVercel(addArgs, value, env);
    console.log(`  ✅ Added ${key} to ${target} environment`);
}

/**
 * Vercel環境変数をクリアする
 */
export async function clearEnvironmentVariables(
    keys: string[],
    target: VercelEnvironmentType,
    env: NodeJS.ProcessEnv
): Promise<void> {
    console.log(`🧹 Clearing ${keys.length} variables from ${target} environment...`);

    for (const key of keys) {
        try {
            const removeArgs = ['env', 'rm', key, target, '-y'];
            await runVercel(removeArgs, undefined, env);
            console.log(`  ✓ Removed ${key} from ${target}`);
        } catch (error) {
            console.warn(
                `  ⚠️  Failed to remove ${key}: ${error instanceof Error ? error.message : error}`
            );
        }
    }

    console.log(`✅ Environment variables cleared from ${target}`);
}

/**
 * 環境変数のプレビューキーを解決する
 */
export function resolvePreviewKeys(key: string, environment: EnvironmentType): string[] {
    return resolveEnvironmentKeys(key, environment);
}

/**
 * Vercel CLIがインストールされているかチェックする
 */
export async function checkVercelCli(): Promise<void> {
    try {
        await runVercel(['--version'], undefined, process.env);
    } catch {
        throw new Error(
            'Vercel CLI is not installed or not in PATH.\n' +
                'Please install it with: npm i -g vercel\n' +
                'Then login with: vercel login'
        );
    }
}

/**
 * Vercelにログインしているかチェックする
 */
export async function checkVercelAuth(): Promise<void> {
    try {
        await runVercel(['whoami'], undefined, process.env);
    } catch {
        throw new Error('You are not logged in to Vercel.\n' + 'Please login with: vercel login');
    }
}

// ============================================================
// 環境ファイル暗号化・復号化機能
// ============================================================

/**
 * 環境ファイル一覧
 */
const ENV_FILES = ['.env', '.env.development', '.env.staging', '.env.prod'];

/**
 * 暗号化ファイル名
 */
const ZIP_FILE = 'env-files.zip';

/**
 * コマンドが利用可能かチェックする
 */
async function checkCommand(command: string): Promise<boolean> {
    const isWindows = process.platform === 'win32';

    try {
        // コマンドが存在するかテスト実行
        await new Promise((resolve, reject) => {
            const testArgs = command === 'zip' ? ['-v'] : ['--version'];
            const proc = spawn(command, testArgs, {
                stdio: 'ignore',
                shell: isWindows,
            });

            proc.on('error', () => {
                reject(new Error('Command not found'));
            });

            proc.on('close', () => {
                resolve(null);
            });
        });
        return true;
    } catch {
        // 代替検出方法を試行
        if (isWindows) {
            try {
                // Windowsでは 'where' コマンドを使用
                await new Promise((resolve, reject) => {
                    const proc = spawn('where', [command], {
                        stdio: 'ignore',
                        shell: true,
                    });
                    proc.on('close', (code) => {
                        if (code === 0) {
                            resolve(null);
                        } else {
                            reject(new Error('Command not found'));
                        }
                    });
                });
                return true;
            } catch {
                return false;
            }
        } else {
            // Unix系では 'command -v' を使用
            try {
                await new Promise((resolve, reject) => {
                    const proc = spawn('sh', ['-c', `command -v ${command}`], {
                        stdio: 'ignore',
                    });
                    proc.on('close', (code) => {
                        if (code === 0) {
                            resolve(null);
                        } else {
                            reject(new Error('Command not found'));
                        }
                    });
                });
                return true;
            } catch {
                return false;
            }
        }
    }
}

/**
 * コマンドを実行する
 */
async function execCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, {
            stdio: ['inherit', 'pipe', 'pipe'],
        });

        let _stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            _stdout += data.toString();
            process.stdout.write(data);
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
            process.stderr.write(data);
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
}

/**
 * パスワードを安全に入力する
 */
async function getPassword(prompt: string): Promise<string> {
    if (!process.stdin.isTTY) {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            return await rl.question(prompt);
        } finally {
            rl.close();
        }
    }

    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(prompt);

    const previousRawMode = Boolean(stdin.isRaw);
    stdin.setRawMode(true);
    stdin.resume();

    return await new Promise<string>((resolve) => {
        let password = '';
        const ESC = String.fromCharCode(27);
        const CTRL_C = 3;
        const CTRL_D = 4;
        const BACKSPACE = 8;
        const DELETE = 127;
        const ENTER = 13;
        const LINE_FEED = 10;

        const cleanup = () => {
            stdin.removeListener('data', onData);
            stdin.setRawMode(previousRawMode);
            stdin.pause();
        };

        function onData(chunk: Buffer) {
            const code = chunk[0];

            if (code === ENTER || code === LINE_FEED || code === CTRL_D) {
                stdout.write(String.fromCharCode(LINE_FEED));
                cleanup();
                resolve(password);
                return;
            }

            if (code === CTRL_C) {
                cleanup();
                process.exit(1);
            }

            if (code === BACKSPACE || code === DELETE) {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    stdout.write(`${ESC}[1D ${ESC}[1D`);
                }
                return;
            }

            if (code === undefined || code === 27) {
                return;
            }

            const text = chunk.toString('utf8');
            password += text;
            stdout.write('*'.repeat(text.length));
        }

        stdin.on('data', onData);
    });
}

/**
 * 環境ファイルを暗号化する
 */
export async function encryptEnvFiles(): Promise<void> {
    // zipコマンドの確認
    const isWindows = process.platform === 'win32';
    const hasZip = await checkCommand('zip');

    if (!hasZip) {
        console.error('❌ Error: zip command not found');
        console.error('Please install zip:');
        console.error('  macOS: brew install zip');
        console.error('  Ubuntu/Debian: sudo apt-get install zip');

        if (isWindows) {
            console.error('  Windows Options:');
            console.error(
                '    1. Install Git for Windows (includes zip): https://git-scm.com/download/win'
            );
            console.error('    2. Use PowerShell Compress-Archive (modify this script)');
            console.error('    3. Install 7-Zip and add to PATH: https://www.7-zip.org/');
            console.error('    4. Use WSL (Windows Subsystem for Linux)');
            console.error('\nFor 7-Zip users, you may need to create an alias:');
            console.error('  PowerShell: Set-Alias zip "C:\\Program Files\\7-Zip\\7z.exe"');
        }

        process.exit(1);
    }

    // プロジェクトルートを取得
    const projectRoot = detectProjectRoot();
    process.chdir(projectRoot); // 作業ディレクトリを変更

    // 存在するenvファイルをチェック
    const existingFiles: string[] = [];
    for (const file of ENV_FILES) {
        try {
            await access(join(projectRoot, file));
            existingFiles.push(file);
        } catch {
            // ファイルが存在しない場合はスキップ
        }
    }

    if (existingFiles.length === 0) {
        console.error('❌ No environment files found to encrypt');
        process.exit(1);
    }

    console.log('📦 Encrypting environment files...');
    console.log(`Files to encrypt: ${existingFiles.join(', ')}`);

    const password = await getPassword('Enter password for encryption: ');
    const confirmPassword = await getPassword('Confirm password: ');

    if (password !== confirmPassword) {
        console.error('❌ Passwords do not match');
        process.exit(1);
    }

    try {
        await execCommand('zip', ['-P', password, ZIP_FILE, ...existingFiles]);
        console.log(`✅ Successfully created encrypted ${ZIP_FILE}`);
        console.log('📋 Share this file and password separately for security');
    } catch (error) {
        console.error('❌ Encryption failed:', error);
        process.exit(1);
    }
}

/**
 * 環境ファイルを復号化する
 */
export async function decryptEnvFiles(): Promise<void> {
    // unzipコマンドの確認
    const isWindows = process.platform === 'win32';
    const hasUnzip = await checkCommand('unzip');

    if (!hasUnzip) {
        console.error('❌ Error: unzip command not found');
        console.error('Please install unzip:');
        console.error('  macOS: brew install unzip');
        console.error('  Ubuntu/Debian: sudo apt-get install unzip');

        if (isWindows) {
            console.error('  Windows Options:');
            console.error(
                '    1. Install Git for Windows (includes unzip): https://git-scm.com/download/win'
            );
            console.error('    2. Use PowerShell Expand-Archive (modify this script)');
            console.error('    3. Install 7-Zip and add to PATH: https://www.7-zip.org/');
            console.error('    4. Use WSL (Windows Subsystem for Linux)');
            console.error('\nFor 7-Zip users, you may need to create an alias:');
            console.error('  PowerShell: Set-Alias unzip "C:\\Program Files\\7-Zip\\7z.exe"');
        }

        process.exit(1);
    }

    // プロジェクトルートを取得
    const projectRoot = detectProjectRoot();
    process.chdir(projectRoot); // 作業ディレクトリを変更

    // zipファイルの存在確認
    try {
        await access(join(projectRoot, ZIP_FILE));
    } catch {
        console.error(`❌ ${ZIP_FILE} not found`);
        process.exit(1);
    }

    console.log(`📦 Decrypting ${ZIP_FILE}...`);

    const password = await getPassword('Enter password for decryption: ');

    try {
        await execCommand('unzip', ['-o', '-P', password, ZIP_FILE]);
        console.log('✅ Successfully decrypted environment files');
        console.log('📋 Environment files restored:');
        for (const file of ENV_FILES) {
            try {
                await access(file);
                console.log(`  ✓ ${file}`);
            } catch {
                // ファイルがアーカイブに含まれていない場合
            }
        }
    } catch {
        console.error('❌ Decryption failed - check your password');
        process.exit(1);
    }
}

/**
 * 暗号化・復号化のメイン処理
 * スクリプトが直接実行された場合に使用
 */
export async function runEncryptionTool(): Promise<void> {
    const command = process.argv[2];

    console.log('🔐 Environment Files Encryption Tool');
    console.log('=====================================\n');

    switch (command) {
        case 'encrypt':
            await encryptEnvFiles();
            break;
        case 'decrypt':
            await decryptEnvFiles();
            break;
        default:
            console.log('Usage:');
            console.log(
                '  tsx scripts/env-tools.ts encrypt - Create encrypted backup of env files'
            );
            console.log(
                '  tsx scripts/env-tools.ts decrypt - Restore env files from encrypted backup'
            );
            console.log('\nAlternatively, use npm/pnpm/yarn scripts:');
            console.log('  pnpm env:encrypt');
            console.log('  pnpm env:decrypt');
            process.exit(1);
    }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (import.meta.url === `file://${process.argv[1]}`) {
    runEncryptionTool().catch((error) => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

// EOF
