// Prisma クライアントとデータベース設定を初期化する。
import { existsSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

type DatabaseProvider = "turso" | "supabase";

type LibSQLConfig = {
  url: string;
  authToken?: string;
};

const DEFAULT_SQLITE_URL = "file:./prisma/dev.db";
const DEFAULT_SUPABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres";
const RELATIVE_PATH_PREFIX_REGEX = /^\.\//;

/**
 * DATABASE_PROVIDER 環境変数から接続先 (libSQL/Turso or Supabase) を判定する。
 */
function resolveProvider(): DatabaseProvider {
  const provider = (process.env.DATABASE_PROVIDER ?? "turso").toLowerCase().trim();

  if (provider === "supabase") {
    return "supabase";
  }

  return "turso";
}

/**
 * libSQL 用の接続文字列を解析し、authToken クエリを分離する。
 */
function parseLibSQLConfig(rawUrl: string | undefined): LibSQLConfig {
  if (!rawUrl) {
    return { url: DEFAULT_SQLITE_URL };
  }

  const [base = rawUrl, query] = rawUrl.split("?");
  if (!query) {
    return { url: rawUrl };
  }

  const params = new URLSearchParams(query);
  const extractedToken = params.get("authToken");
  if (extractedToken !== null) {
    params.delete("authToken");
  }

  const remainingQuery = params.toString();
  const cleanUrl = remainingQuery ? `${base}?${remainingQuery}` : base;

  return {
    url: cleanUrl,
    ...(extractedToken !== null ? { authToken: extractedToken } : {}),
  };
}

/**
 * Prisma が参照する環境変数 (DATABASE_URL / PRISMA_DATABASE_URL) を設定する。
 * libsql:// が既に指定されている場合は上書きしない。
 */
function ensurePrismaEnv(url: string): void {
  // libsql://URLが既に設定されている場合は上書きしない
  const currentUrl = process.env.DATABASE_URL;
  if (currentUrl?.startsWith("libsql://")) {
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

// SQLite の相対パスを絶対URLに正規化し、実在するパス候補を順に探索する
function normalizeSqliteUrl(url: string): string {
  if (!url.startsWith("file:")) {
    return url;
  }

  const withoutScheme = url.slice("file:".length);

  // すでに絶対パスが指定されている場合はそのまま返す
  if (withoutScheme.startsWith("/")) {
    return url;
  }

  const candidates: string[] = [];

  if (isAbsolute(withoutScheme)) {
    candidates.push(withoutScheme);
  } else {
    // ./ を除去して可読性を上げる
    const trimmed = withoutScheme.replace(RELATIVE_PATH_PREFIX_REGEX, "");
    const fromCwd = resolve(process.cwd(), withoutScheme);
    candidates.push(fromCwd);

    if (!trimmed.startsWith("prisma/")) {
      candidates.push(resolve(process.cwd(), "prisma", trimmed));
    }

    // ビルド後の .next などからでも辿れるようにモジュール基準の候補も追加
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    candidates.push(resolve(moduleDir, "../../", trimmed));
    if (!trimmed.startsWith("prisma/")) {
      candidates.push(resolve(moduleDir, "../../prisma", trimmed));
    }
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

// libSQL (Turso/SQLite) と PostgreSQL (Supabase) で設定を切り替える
if (provider === "turso") {
  const parsed = parseLibSQLConfig(process.env.DATABASE_URL);
  const url = parsed.url || DEFAULT_SQLITE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN ?? parsed.authToken ?? undefined;

  if (url.startsWith("libsql://")) {
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
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
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
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
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
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export { prisma };
export default prisma;

// ファイル終端

// EOF
