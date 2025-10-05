#!/usr/bin/env tsx
/**
 * Vercel環境変数操作用の共通ユーティリティ
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * プロジェクト設定の型定義
 */
export type ProjectConfig = {
    readonly orgId: string;
    readonly projectId: string;
};

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
 * プロジェクト設定を読み込む
 */
export async function readProjectConfig(): Promise<ProjectConfig> {
    const scriptDir = dirname(fileURLToPath(import.meta.url));
    const projectRoot = resolve(scriptDir, '../');
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
    const suffix = environment.toUpperCase().slice(0, 3); // DEV, STA, PRO

    if (key.endsWith(`_${suffix}`)) {
        return [key];
    }

    return [`${key}_${suffix}`];
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

// EOF
