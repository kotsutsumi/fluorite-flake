import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type DatabaseProvider = 'turso' | 'supabase';

type LibSQLConfig = {
    url: string;
    authToken?: string;
};

const DEFAULT_SQLITE_URL = 'file:./prisma/dev.db';
const DEFAULT_SUPABASE_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';

function resolveProvider(): DatabaseProvider {
    const provider = (process.env.DATABASE_PROVIDER ?? 'turso').toLowerCase().trim();

    if (provider === 'supabase') {
        return 'supabase';
    }

    return 'turso';
}

function parseLibSQLConfig(rawUrl: string | undefined): LibSQLConfig {
    if (!rawUrl) {
        return { url: DEFAULT_SQLITE_URL };
    }

    const [base, query] = rawUrl.split('?');
    if (!query) {
        return { url: rawUrl };
    }

    const params = new URLSearchParams(query);
    const extractedToken = params.get('authToken') ?? undefined;
    if (extractedToken) {
        params.delete('authToken');
    }

    const remainingQuery = params.toString();
    const cleanUrl = remainingQuery ? `${base}?${remainingQuery}` : base;

    return { url: cleanUrl, authToken: extractedToken };
}

function ensurePrismaEnv(url: string): void {
    // libsql://URLが既に設定されている場合は上書きしない
    const currentUrl = process.env.DATABASE_URL;
    if (currentUrl?.startsWith('libsql://')) {
        return;
    }

    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = url;
    }

    if (!process.env.PRISMA_DATABASE_URL) {
        process.env.PRISMA_DATABASE_URL = url;
    }
}

// データベースファイルの親ディレクトリを必要に応じて作成する
function ensureParentDirectory(filePath: string): void {
    const directory = dirname(filePath);
    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }
}

// SQLite の相対パスを絶対URLに正規化する
function normalizeSqliteUrl(url: string): string {
    if (!url.startsWith('file:')) {
        return url;
    }

    const withoutScheme = url.slice('file:'.length);

    // すでに絶対パスが指定されている場合はそのまま返す
    if (withoutScheme.startsWith('/')) {
        return url;
    }

    const candidates: string[] = [];

    if (isAbsolute(withoutScheme)) {
        candidates.push(withoutScheme);
    } else {
        // ./ を除去して可読性を上げる
        const trimmed = withoutScheme.replace(/^\.\//, '');
        const fromCwd = resolve(process.cwd(), withoutScheme);
        candidates.push(fromCwd);

        // prisma/prisma/dev.db のような二重ディレクトリ生成を吸収
        candidates.push(resolve(process.cwd(), 'prisma', trimmed));

        // ビルド後の .next などからでも辿れるようにモジュール基準の候補も追加
        const moduleDir = dirname(fileURLToPath(import.meta.url));
        candidates.push(resolve(moduleDir, '../../', trimmed));
        candidates.push(resolve(moduleDir, '../../prisma', trimmed));
    }

    const resolvedPath = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];

    if (!resolvedPath) {
        // 候補が生成できない場合は従来のロジックにフォールバック
        const fallback = resolve(process.cwd(), withoutScheme);
        ensureParentDirectory(fallback);
        return pathToFileURL(fallback).toString();
    }

    ensureParentDirectory(resolvedPath);
    return pathToFileURL(resolvedPath).toString();
}

const provider = resolveProvider();
let prisma: PrismaClient;

if (provider === 'turso') {
    const parsed = parseLibSQLConfig(process.env.DATABASE_URL);
    const url = parsed.url || DEFAULT_SQLITE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN ?? parsed.authToken ?? undefined;

    if (url.startsWith('libsql://')) {
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = url;
        }
        if (!process.env.PRISMA_DATABASE_URL) {
            process.env.PRISMA_DATABASE_URL = url;
        }
        if (!process.env.DIRECT_DATABASE_URL) {
            process.env.DIRECT_DATABASE_URL = url;
        }

        const adapter = new PrismaLibSQL({
            url,
            authToken,
        });

        prisma = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    } else {
        const normalizedUrl = normalizeSqliteUrl(url);
        ensurePrismaEnv(normalizedUrl);

        // ローカルSQLiteの場合もPrismaLibSQLアダプターを使用
        const adapter = new PrismaLibSQL({
            url: normalizedUrl,
            authToken: undefined, // ローカルファイルなのでトークン不要
        });

        prisma = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
    }
} else {
    // Supabase (PostgreSQL) の場合
    const databaseUrl =
        process.env.DATABASE_URL ?? process.env.DIRECT_DATABASE_URL ?? DEFAULT_SUPABASE_URL;

    // PostgreSQLなので正規化は不要、環境変数設定のみ
    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = databaseUrl;
    }
    if (!process.env.PRISMA_DATABASE_URL) {
        process.env.PRISMA_DATABASE_URL = databaseUrl;
    }

    prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
}

export { prisma };
export default prisma;

// EOF
