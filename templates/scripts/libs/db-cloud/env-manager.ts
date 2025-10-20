/**
 * Turso の接続情報を .env.* に書き出すための補助モジュール。
 * ファイル入出力以外の処理はテスト可能な純粋関数として切り出している。
 */
import { dirname, join } from "node:path";

import {
  ENV_ASSIGN_CAPTURE_REGEX,
  ENV_FILE_NAME,
  ENV_KEY_VALUE_REGEX,
  LINE_SPLIT_REGEX,
  SIMPLE_ENV_VALUE_REGEX,
  TOKEN_VISIBLE_SEGMENT,
  TURSO_HOST_PREFIX_REGEX,
} from "./constants.js";
import type { EnvironmentCredentials, EnvManagerDeps } from "./types.js";

export async function saveCredentialsToEnv(
  deps: EnvManagerDeps,
  backendRoot: string,
  credentials: EnvironmentCredentials
): Promise<void> {
  const envFile = ENV_FILE_NAME[credentials.env];
  const envPath = join(backendRoot, envFile);

  const current = await readEnvFile(deps, envPath);
  const recordedAt = new Date().toISOString();
  const updates: Record<string, string> = {
    DATABASE_PROVIDER: "turso",
    DATABASE_URL: credentials.databaseUrl,
    DIRECT_DATABASE_URL: credentials.databaseUrl,
    PRISMA_DATABASE_URL: credentials.databaseUrl,
    TURSO_DATABASE_URL: credentials.databaseUrl,
    TURSO_AUTH_TOKEN: credentials.authToken,
    TURSO_DATABASE_NAME: credentials.databaseName,
    TURSO_LAST_SYNCED_AT: recordedAt,
  };

  const updated = applyEnvUpdates(current, updates);
  await writeEnvFile(deps, envPath, updated);
  deps.logger.info(`📝 apps/backend/${envFile} を更新しました。`);
}

async function readEnvFile(deps: EnvManagerDeps, path: string): Promise<string> {
  try {
    return await deps.readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

async function writeEnvFile(deps: EnvManagerDeps, path: string, content: string): Promise<void> {
  const directory = dirname(path);
  if (!deps.exists(directory)) {
    await deps.mkdir(directory, { recursive: true });
  }
  await deps.writeFile(path, content, "utf8");
}

export function applyEnvUpdates(current: string, updates: Record<string, string>): string {
  const lines = current.split(LINE_SPLIT_REGEX);
  if (lines.length > 0 && lines.at(-1) === "") {
    lines.pop();
  }
  const handled = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(ENV_ASSIGN_CAPTURE_REGEX);
    if (!match) {
      continue;
    }
    const key = match[1];
    if (Object.hasOwn(updates, key)) {
      lines[index] = `${key}=${formatEnvValue(updates[key])}`;
      handled.add(key);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (handled.has(key)) {
      continue;
    }
    lines.push(`${key}=${formatEnvValue(value)}`);
  }

  const result = lines.join("\n").trimEnd();
  return `${result}\n`;
}

export function formatEnvValue(value: string): string {
  if (SIMPLE_ENV_VALUE_REGEX.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

export function formatTokenPreview(token: string): string {
  if (token.length <= TOKEN_VISIBLE_SEGMENT * 2) {
    return token;
  }
  const prefix = token.slice(0, TOKEN_VISIBLE_SEGMENT);
  const suffix = token.slice(-TOKEN_VISIBLE_SEGMENT);
  return `${prefix}…${suffix}`;
}

export function parseEnvContent(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split(LINE_SPLIT_REGEX);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(ENV_KEY_VALUE_REGEX);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    result.set(key, stripQuotes(rawValue));
  }
  return result;
}

export function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function inferDatabaseNameFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname ?? "";
    const match = host.match(TURSO_HOST_PREFIX_REGEX);
    if (match) {
      return match[1];
    }
    return;
  } catch {
    return;
  }
}

export function createEnvManagerDeps(
  logger: EnvManagerDeps["logger"],
  fs: {
    readonly readFile: EnvManagerDeps["readFile"];
    readonly writeFile: EnvManagerDeps["writeFile"];
    readonly mkdir: EnvManagerDeps["mkdir"];
    readonly exists: EnvManagerDeps["exists"];
  }
): EnvManagerDeps {
  return {
    readFile: fs.readFile,
    writeFile: fs.writeFile,
    mkdir: fs.mkdir,
    exists: fs.exists,
    logger,
  };
}

// EOF
