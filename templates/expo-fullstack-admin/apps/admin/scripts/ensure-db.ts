import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { execa } from 'execa';
import { config as loadEnv } from 'dotenv';
import { pathToFileURL } from 'node:url';

function loadEnvFiles(): void {
    const envFiles = ['.env.local', '.env'];

    for (const file of envFiles) {
        const path = join(process.cwd(), file);
        if (existsSync(path)) {
            loadEnv({ path, override: true });
        }
    }
}

// Prisma CLI が prisma/prisma/dev.db を生成してしまうケースを矯正する
function stabilizeLocalSqlitePath(relativePath: string, absolutePath: string): void {
    if (!relativePath) {
        return;
    }

    const trimmed = relativePath.replace(/^\.\//, '');
    const nestedPath = resolve(process.cwd(), 'prisma', trimmed);

    if (!existsSync(absolutePath) && existsSync(nestedPath)) {
        mkdirSync(dirname(absolutePath), { recursive: true });
        renameSync(nestedPath, absolutePath);
    }
}

function normalizeLocalDatabaseEnv(): string | null {
    const candidates: (string | undefined)[] = [
        process.env.PRISMA_DATABASE_URL,
        process.env.DATABASE_URL,
        process.env.DIRECT_DATABASE_URL,
    ];

    const candidate = candidates.find(
        (value): value is string => typeof value === 'string' && value.startsWith('file:')
    );

    if (!candidate) {
        return null;
    }

    const withoutScheme = candidate.slice('file:'.length);

    if (withoutScheme.length === 0) {
        process.env.DATABASE_URL = candidate;
        process.env.DIRECT_DATABASE_URL = candidate;
        process.env.PRISMA_DATABASE_URL = candidate;
        return candidate;
    }

    if (withoutScheme.startsWith('/') || isAbsolute(withoutScheme)) {
        process.env.DATABASE_URL = candidate;
        process.env.DIRECT_DATABASE_URL = candidate;
        process.env.PRISMA_DATABASE_URL = candidate;
        return candidate;
    }

    const absolutePath = resolve(process.cwd(), withoutScheme);
    stabilizeLocalSqlitePath(withoutScheme, absolutePath);
    const fileUrl = pathToFileURL(absolutePath).toString();

    process.env.DATABASE_URL = fileUrl;
    process.env.DIRECT_DATABASE_URL = fileUrl;
    process.env.PRISMA_DATABASE_URL = fileUrl;

    return fileUrl;
}

function resolveRemoteLibsqlUrl(): string | null {
    const candidates: (string | undefined)[] = [
        process.env.DATABASE_URL,
        process.env.PRISMA_DATABASE_URL,
        process.env.DIRECT_DATABASE_URL,
        process.env.TURSO_DATABASE_URL,
        process.env.LIBSQL_DATABASE_URL,
    ];

    return (
        candidates.find(
            (value): value is string => typeof value === 'string' && value.startsWith('libsql://')
        ) ?? null
    );
}

function isMissingTableError(error: unknown): boolean {
    if (error && typeof error === 'object') {
        const maybeCode = (error as { code?: string }).code;
        if (maybeCode === 'P2021') {
            return true;
        }
    }

    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('no such table') ||
            message.includes('does not exist') ||
            message.includes('p2021')
        );
    }

    return false;
}

async function hasSessionTable(prisma: PrismaClient): Promise<boolean> {
    try {
        await prisma.session.findFirst({ select: { id: true } });
        return true;
    } catch (error) {
        if (isMissingTableError(error)) {
            return false;
        }
        throw error;
    }
}

async function ensureDatabase(): Promise<void> {
    // 1. .envファイル読み込み
    loadEnvFiles();

    // 2. URL正規化（libsql://優先、次にfile:の絶対パス変換）
    const remoteLibsqlUrl = resolveRemoteLibsqlUrl();
    const normalizedDatabaseUrl = remoteLibsqlUrl ?? normalizeLocalDatabaseEnv();

    // 3. 環境変数設定
    const baseEnv: NodeJS.ProcessEnv = { ...process.env };

    if (normalizedDatabaseUrl) {
        baseEnv.DATABASE_URL = normalizedDatabaseUrl;
        baseEnv.DIRECT_DATABASE_URL = normalizedDatabaseUrl;
        baseEnv.PRISMA_DATABASE_URL = normalizedDatabaseUrl;

        // Prisma CLIが使用する環境変数も更新
        process.env.DATABASE_URL = normalizedDatabaseUrl;
        process.env.DIRECT_DATABASE_URL = normalizedDatabaseUrl;
        process.env.PRISMA_DATABASE_URL = normalizedDatabaseUrl;
    }

    if (remoteLibsqlUrl) {
        const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN;
        if (authToken) {
            baseEnv.TURSO_AUTH_TOKEN = authToken;
            baseEnv.LIBSQL_AUTH_TOKEN = authToken;
            process.env.TURSO_AUTH_TOKEN = authToken;
            process.env.LIBSQL_AUTH_TOKEN = authToken;
        }
    }

    const commandEnv: NodeJS.ProcessEnv =
        normalizedDatabaseUrl || remoteLibsqlUrl ? baseEnv : process.env;

    // 4. lib/db import（環境変数確定後）
    const { default: prisma } = await import('../src/lib/db');

    try {
        const ready = await hasSessionTable(prisma);
        if (ready) {
            console.log('🛡️ データベースは初期化済みです');
            return;
        }

        console.log('🛠️ データベーススキーマを適用しています...');
        await prisma.$disconnect();
        await execa('pnpm', ['db:push'], { stdio: 'inherit', env: commandEnv });

        console.log('🌱 シードデータを投入しています...');
        await execa('pnpm', ['db:seed'], { stdio: 'inherit', env: commandEnv });

        console.log('✅ データベース初期化が完了しました');
    } finally {
        await prisma.$disconnect();
    }
}

ensureDatabase().catch((error) => {
    console.error('❌ データベース初期化に失敗しました');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});

// EOF
